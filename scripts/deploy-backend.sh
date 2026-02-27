#!/bin/bash
set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID="290046508532"
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/huntboard-backend"
EC2_IP="44.206.144.96"
SSH_KEY="~/.ssh/huntboard-ec2.pem"

echo "==> Building backend image (ARM64)..."
docker build --platform linux/arm64 -t huntboard-backend ./backend/

echo "==> Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

echo "==> Tagging and pushing..."
docker tag huntboard-backend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

echo "==> Deploying to EC2..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
  cd /opt/huntboard
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 290046508532.dkr.ecr.us-east-1.amazonaws.com
  docker compose pull
  docker compose up -d
  sleep 5
  docker exec huntboard-backend alembic stamp head 2>/dev/null || true
  curl -sf http://localhost/api/health && echo " ✓ Backend healthy" || echo " ✗ Backend unhealthy"
  docker image prune -f
EOF

echo "==> Backend deployed!"
