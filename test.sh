#!/bin/bash

# starts uvicorn and react dev servers for testing, when one is killed the other is also killed
npx --prefix cndamanager/frontend \
    concurrently -c "auto" -k -p "[{name} - {time}]" -n "uvicorn,react" \
    "python3 -m uvicorn cndamanager.api.main:app --reload" "npm --prefix cndamanager/frontend run start"

