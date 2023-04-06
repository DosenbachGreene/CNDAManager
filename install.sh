#!/bin/bash

# Install python and node dependencies
python3 -m pip install -r requirements.txt
pushd cndamanager/frontend
npm install && npm run build
popd
