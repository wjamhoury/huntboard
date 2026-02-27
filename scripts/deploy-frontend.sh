#!/bin/bash
set -euo pipefail

BUCKET="huntboard-frontend-1ad1715d"
DISTRIBUTION_ID="E3BXS7N5PX4WPF"

echo "==> Building frontend..."
cd frontend
VITE_API_URL=https://huntboard.app/api/v1 \
VITE_COGNITO_USER_POOL_ID=us-east-1_H05jUkMV7 \
VITE_COGNITO_CLIENT_ID=5gmo5ojqegpnqqi28cnml0o2fb \
VITE_COGNITO_DOMAIN=huntboard.auth.us-east-1.amazoncognito.com \
VITE_AUTH_DEV_MODE=false \
npm run build
cd ..

echo "==> Syncing to S3..."
aws s3 sync frontend/dist/ s3://$BUCKET/ --delete --cache-control "public, max-age=31536000, immutable"
aws s3 cp frontend/dist/index.html s3://$BUCKET/index.html --cache-control "no-cache, no-store, must-revalidate"

echo "==> Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "==> Frontend deployed! CloudFront invalidation in progress (1-2 min)."
