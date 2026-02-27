.PHONY: dev deploy-backend deploy-frontend deploy-all ssh logs db-backup

dev:
	docker compose up --build

deploy-backend:
	bash scripts/deploy-backend.sh

deploy-frontend:
	bash scripts/deploy-frontend.sh

deploy-all:
	bash scripts/deploy-all.sh

ssh:
	ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96

logs:
	ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 "cd /opt/huntboard && docker compose logs -f --tail=100"

db-backup:
	ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 "docker exec huntboard-db pg_dump -U huntboard huntboard" > backup-$$(date +%Y-%m-%d).sql
