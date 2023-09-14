import os
import logging
import xnat
import time
import hashlib
from typing import Annotated, cast
from fastapi import FastAPI, Request, BackgroundTasks, Form, Response
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List
from uuid import UUID

# Instantiate FastAPI app
app = FastAPI()

# Create rate limits to limit amount of times a user can request data to be downloaded per minute
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# add static files
STATIC_FILES = str(Path(__file__).absolute().parent / "dist" / "static_assets")
app.mount("/static_assets", StaticFiles(directory=STATIC_FILES), name="static")

# Instantiate logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create a dictionary to keep track of download jobs
download_queue = dict()


""" The Auth logic

We want a way to store user login information so that we can use it to connect to XNAT, but password
should NEVER directly accessible.

Login information is stored in a dictionary called login_info. The key is the username and the value is the password.

However, login info is only obtainable through a userhash cookie, which is only obtainable if the user has successfully
logged in. The userhash cookie is a hash of the username and the current time. The userhash cookie is set when the user
successfully logs in.

TODO: Add a timeout to the userhash cookie so that it expires after a certain amount of time
TODO: Delete login info after a certain amount of time
TODO: Add a logout endpoint that deletes the userhash cookie and login info

"""

# Login info
login_info = dict()

# hash to username mapping
user_hashes = dict()

# Set output directory for downloaded data
output_dir = Path(os.environ.get("OUTPUT_DIR", ".cache"))

# get main page
INDEX_HTML = str(Path(__file__).absolute().parent / "dist" / "index.html")
with open(INDEX_HTML, "r") as f:
    index_html = f.read()


@app.get("/")
def main_page():
    return HTMLResponse(content=index_html, status_code=200)


@app.post("/api/login")
def login_page(username: Annotated[str, Form()], password: Annotated[str, Form()], response: Response):
    login_success = False
    try:
        with xnat.connect("https://cnda.wustl.edu", user=username, password=password, extension_types=False) as s:
            login_success = True
    except Exception as e:
        pass
    if login_success:
        # generate cookie hash
        h = hashlib.new("sha256")
        h.update(bytes(username + str(time.time()), "utf-8"))
        user_hash = h.hexdigest()
        user_hashes[user_hash] = username
        # record login info
        login_info[username] = password
        response.set_cookie(key="userhash", value=user_hash)
        return {"login_status": 0}
    else:
        return {"login_status": 1}


@app.get("/api/projects")
def get_projects(request: Request):
    """
    TODO: Change from hardcoded values
    Currently this method only allows users to choose from Nico's projects
    """
    # get cookie
    user_hash = request.cookies.get("userhash")
    if user_hash not in user_hashes:  # no such user
        return []
    else:
        username = user_hashes[user_hash]
        # get password
        password = login_info[username]
        # get projects
        projects = []
        with xnat.connect("https://cnda.wustl.edu", user=username, password=password, extension_types=False) as session:
            project_list = session.projects
            # only get projects that the user has access to
            # TODO: This is kind of slow... probably a better way to determine what projects the user has access to
            projects = [project for project in project_list if username in project_list[project].users]
        return projects


@app.get("/api/projects/{project_id}")
def get_subjects(request: Request, project_id: str):
    """
    Given a project id, return a list of subjects
    """
    user_hash = request.cookies.get("userhash")
    if user_hash not in user_hashes:  # no such user
        return []
    else:
        username = user_hashes[user_hash]
        # get password
        password = login_info[username]
        with xnat.connect("https://cnda.wustl.edu", user=username, password=password, extension_types=False) as session:
            subject_list = session.projects[project_id].subjects
            subject_labels = [subject_list[subject].label for subject in range(len(subject_list))]
        return subject_labels


@app.post("/api/download")
async def download_data(request: Request, background_tasks: BackgroundTasks):
    # TODO: handle when user is not logged in
    user_hash = cast(str, request.cookies.get("userhash"))

    data = await request.json()
    download_job_id = UUID(data["download_job_id"])
    project_id = data["project_id"]
    subject_ids = data["subject_ids"]

    download_queue[download_job_id] = dict()

    for sub in subject_ids:
        download_queue[download_job_id][sub] = "queued"

    task = background_tasks.add_task(downloading_queue, download_job_id, project_id, subject_ids, user_hash)

    return {"message": f"Download job for job ID {download_job_id} initiated"}


@app.get("/api/download/status/{download_job_id}")
async def get_download_status(download_job_id: UUID):
    if download_job_id not in download_queue:
        return "Download job not found"

    return JSONResponse(content=download_queue[download_job_id])


def downloading_queue(download_job_id: UUID, project_id: str, subject_ids: List[str], user_hash: str):
    with ThreadPoolExecutor(max_workers=5) as executor:
        download_futures = {
            executor.submit(downloader, download_job_id, project_id, subject, user_hash): subject
            for subject in subject_ids
        }

        for completed_download in as_completed(download_futures):
            completed_subject = download_futures[completed_download]
            completed_message = completed_download.result()
            if "success" in completed_message:
                download_queue[download_job_id][completed_subject] = "complete"
            logger.info(completed_message)


def downloader(download_job_id: UUID, project_id: str, subject_id: str, user_hash: str):
    logger.info(f"INSIDE OF DOWNLOADER: downloading data for {project_id} and {subject_id} in background")

    download_queue[download_job_id][subject_id] = "in_progress"

    # get username and password
    username = user_hashes[user_hash]
    password = login_info[username]

    try:
        with xnat.connect("https://cnda.wustl.edu", user=username, password=password, extension_types=False) as session:
            # Check to ensure experiment data exists
            if len(session.projects[project_id].subjects[subject_id].experiments) == 0:
                download_queue[download_job_id][subject_id] = "no_data_to_download"
                return (
                    f"failure: could not download data for {project_id} and {subject_id} in background \n"
                    "Error: no experiments found for {subject_id} in {project_id}"
                )

            scan = session.projects[project_id].subjects[subject_id].experiments[0]
            full_output_path = output_dir / project_id / f"{subject_id}.zip"
            parent_output_path = full_output_path.parent

            # Create parent directory if it doesn't exist
            if not parent_output_path.exists():
                parent_output_path.mkdir(parents=True, exist_ok=True)

            # Download data if it doesn't exist
            if not full_output_path.exists():
                scan.download(full_output_path)
            else:
                logger.info(f"File already exists for {subject_id} in {project_id} - skipping download")
    except Exception as e:
        download_queue[download_job_id][subject_id] = "failed"
        return f"failure: could not download data for {project_id} and {subject_id} in background \n Error: {e}"

    return f"success: downloaded data for {project_id} and {subject_id} in background"


# configuring app to
# uvicorn main:app --host 0.0.0.0 --port 8000
