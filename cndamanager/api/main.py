import os
import logging
import xnat
from fastapi import FastAPI, Request, BackgroundTasks
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

# Create rate limite to limit amount of times a user can request data to be downloaded per minute
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# add static files
STATIC_FILES = str(Path(__file__).absolute().parent / "dist" / "static")
app.mount("/static", StaticFiles(directory=STATIC_FILES), name="static")

# Instantiate logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create a dictionary to keep track of download jobs
download_queue = dict()

# Set output directory for downloaded data
output_dir = Path(os.environ.get("OUTPUT_DIR", "/Users/vahdetasuljic/data"))

# get main page
INDEX_HTML = str(Path(__file__).absolute().parent / "dist" / "index.html")
with open(INDEX_HTML, "r") as f:
    index_html = f.read()


@app.get("/")
def main_page():
    return HTMLResponse(content=index_html, status_code=200)


@app.get("/api/projects")
def get_projects():
    """
    TODO: Change from hardcoded values
    Currently this method only allows users to choose from Nico's projects
    """

    return ["NP1173", "MSC", "NP1091", "NP1054", "ABCD_pilot", "CIMT"]


@app.get("/api/projects/{project_id}")
def get_subjects(project_id: str):
    """
    Given a project id, return a list of subjects
    """

    with xnat.connect("https://cnda.wustl.edu", user=None, password=None, extension_types=False) as session:
        subject_list = session.projects[project_id].subjects
        subject_labels = [subject_list[subject].label for subject in range(len(subject_list))]

    return subject_labels


@app.post("/api/download")
async def download_data(request: Request, background_tasks: BackgroundTasks):

    data = await request.json()
    download_job_id = UUID(data["download_job_id"])
    project_id = data["project_id"]
    subject_ids = data["subject_ids"]

    download_queue[download_job_id] = dict()

    for sub in subject_ids:
        download_queue[download_job_id][sub] = "queued"

    task = background_tasks.add_task(downloading_queue, download_job_id, project_id, subject_ids)

    return {"message": f"Download job for job ID {download_job_id} initiated"}


@app.get("/api/download/status/{download_job_id}")
async def get_download_status(download_job_id: UUID):

    if download_job_id not in download_queue:
        return "Download job not found"

    return JSONResponse(content=download_queue[download_job_id])


def downloading_queue(download_job_id: UUID, project_id: str, subject_ids: List[str]):

    with ThreadPoolExecutor(max_workers=5) as executor:

        download_futures = {
            executor.submit(downloader, download_job_id, project_id, subject): subject for subject in subject_ids
        }

        for completed_download in as_completed(download_futures):
            completed_subject = download_futures[completed_download]
            completed_message = completed_download.result()
            if "success" in completed_message:
                download_queue[download_job_id][completed_subject] = "complete"
            logger.info(completed_message)


def downloader(download_job_id: UUID, project_id: str, subject_id: str):

    logger.info(f"INSIDE OF DOWNLOADER: downloading data for {project_id} and {subject_id} in background")

    download_queue[download_job_id][subject_id] = "in_progress"

    try:
        with xnat.connect("https://cnda.wustl.edu", user=None, password=None, extension_types=False) as session:
            #    download data
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
