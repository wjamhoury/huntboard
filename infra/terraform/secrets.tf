# -----------------------------------------------------------------------------
# Secrets Manager
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "main" {
  name                    = "huntboard/prod"
  description             = "HuntBoard production secrets"
  recovery_window_in_days = 0  # Immediate deletion for easier testing

  tags = {
    Name = "${var.app_name}-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "main" {
  secret_id = aws_secretsmanager_secret.main.id

  secret_string = jsonencode({
    DB_PASSWORD       = var.db_password
    ANTHROPIC_API_KEY = var.anthropic_api_key
    SERPAPI_KEY       = var.serpapi_key
  })
}
