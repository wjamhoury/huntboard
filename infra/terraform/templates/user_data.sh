#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "==> Installing Docker..."
dnf update -y
dnf install -y docker jq
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

echo "==> Installing Docker Compose..."
COMPOSE_VERSION="v2.29.1"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "==> Creating app directory..."
mkdir -p /opt/huntboard
chown ec2-user:ec2-user /opt/huntboard

echo "==> Fetching secrets..."
SECRETS=$(aws secretsmanager get-secret-value \
  --secret-id huntboard/prod \
  --region ${region} \
  --query SecretString \
  --output text)

echo "==> Writing docker-compose.yml..."
cat > /opt/huntboard/docker-compose.yml << 'COMPOSE'
services:
  db:
    image: postgres:16-alpine
    container_name: huntboard-db
    restart: always
    environment:
      POSTGRES_DB: huntboard
      POSTGRES_USER: huntboard
      POSTGRES_PASSWORD: $${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U huntboard"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    image: ${ecr_repo}:latest
    container_name: huntboard-backend
    restart: always
    ports:
      - "80:8000"
    environment:
      DATABASE_URL: postgresql://huntboard:$${DB_PASSWORD}@db:5432/huntboard
      S3_RESUME_BUCKET: ${resume_bucket}
      AWS_REGION: ${region}
      COGNITO_USER_POOL_ID: ${cognito_user_pool_id}
      COGNITO_APP_CLIENT_ID: ${cognito_client_id}
      ANTHROPIC_API_KEY: $${ANTHROPIC_API_KEY}
      SERPAPI_KEY: $${SERPAPI_KEY}
      FRONTEND_URL: https://${domain_name}
      AUTH_DEV_MODE: "false"
      APP_VERSION: "1.0.0"
      USE_LOCAL_STORAGE: "false"
    depends_on:
      db:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
COMPOSE

echo "==> Writing .env from secrets..."
echo "$SECRETS" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > /opt/huntboard/.env

echo "==> Logging into ECR..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region ${region} | \
  docker login --username AWS --password-stdin $${ACCOUNT_ID}.dkr.ecr.${region}.amazonaws.com

echo "==> Starting application..."
cd /opt/huntboard
docker compose pull
docker compose up -d

echo "==> Running database migrations..."
sleep 10
docker exec huntboard-backend alembic upgrade head

echo "==> Setting up backup cron..."
mkdir -p /opt/huntboard/scripts
cat > /opt/huntboard/scripts/backup.sh << 'BACKUP'
#!/bin/bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M)
docker exec huntboard-db pg_dump -U huntboard huntboard | \
  gzip | \
  aws s3 cp - s3://${backup_bucket}/db/$${TIMESTAMP}.sql.gz
# Clean up backups older than 30 days
aws s3 ls s3://${backup_bucket}/db/ | \
  awk '{print $4}' | \
  while read file; do
    file_date=$(echo $file | grep -oP '\d{4}-\d{2}-\d{2}')
    if [[ $(date -d "$file_date" +%s) -lt $(date -d "30 days ago" +%s) ]]; then
      aws s3 rm "s3://${backup_bucket}/db/$file"
    fi
  done
BACKUP
chmod +x /opt/huntboard/scripts/backup.sh
echo "0 3 * * * ec2-user /opt/huntboard/scripts/backup.sh" > /etc/cron.d/huntboard-backup

echo "==> Creating systemd service for auto-start on reboot..."
cat > /etc/systemd/system/huntboard.service << 'SERVICE'
[Unit]
Description=HuntBoard Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=ec2-user
WorkingDirectory=/opt/huntboard
ExecStart=/usr/local/lib/docker/cli-plugins/docker-compose up -d
ExecStop=/usr/local/lib/docker/cli-plugins/docker-compose down

[Install]
WantedBy=multi-user.target
SERVICE
systemctl enable huntboard

echo "==> Setup complete!"
