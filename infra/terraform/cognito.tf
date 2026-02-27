# -----------------------------------------------------------------------------
# Cognito User Pool for Authentication
# -----------------------------------------------------------------------------

resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-users"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Use Cognito default email (free, 50/day limit)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Schema attributes
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  # Deletion protection (INACTIVE for easier testing/cleanup)
  deletion_protection = "INACTIVE"

  # MFA configuration (optional, off for simplicity)
  mfa_configuration = "OFF"

  tags = {
    Name = "${var.app_name}-users"
  }
}

# Cognito User Pool Client for SPA
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.app_name}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for SPA
  generate_secret = false

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # OAuth settings
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs
  callback_urls = [
    "https://${var.domain_name}/callback",
    "http://localhost:5173/callback"
  ]

  # Logout URLs
  logout_urls = [
    "https://${var.domain_name}",
    "http://localhost:5173"
  ]

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.app_name
  user_pool_id = aws_cognito_user_pool.main.id
}
