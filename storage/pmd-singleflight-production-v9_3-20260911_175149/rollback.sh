#!/usr/bin/env bash
set -euo pipefail

NAME="paymydine-frontend-v2"
LIVE="/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
ENV_JSON="/var/www/paymydine/storage/pmd-singleflight-production-v9_3-20260911_175149/frontend-env.json"

pm2 delete "$NAME" >/dev/null 2>&1 || true

python3 - "$ENV_JSON" "$LIVE" "$NAME" <<'PY'
import json
import os
import subprocess
import sys

env_file, cwd, name = sys.argv[1:4]

with open(env_file) as f:
    saved = json.load(f)

env = os.environ.copy()
for key, value in saved.items():
    env[key] = str(value)

subprocess.run(
    [
        "pm2",
        "start",
        "npm",
        "--name",
        name,
        "--cwd",
        cwd,
        "--",
        "start",
    ],
    env=env,
    check=True,
)
PY

pm2 save
echo "Rollback completed to:"
echo "$LIVE"
