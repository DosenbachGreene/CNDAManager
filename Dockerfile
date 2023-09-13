FROM nikolaik/python-nodejs:python3.9-nodejs18-alpine

# set working directory
WORKDIR /code

# copy over things
COPY ./requirements.txt /code/requirements.txt
COPY ./cndamanager /code/cndamanager

# install things
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN cd cndamanager/frontend && npm install && npm run build

# clear the entrypoint
ENTRYPOINT []
# set CMD
CMD ["uvicorn", "cndamanager.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
