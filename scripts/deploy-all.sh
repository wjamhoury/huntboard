#!/bin/bash
set -euo pipefail
echo "=== Deploying HuntBoard ==="
bash scripts/deploy-backend.sh
bash scripts/deploy-frontend.sh
echo "=== Full deploy complete! ==="
