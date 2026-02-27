# -----------------------------------------------------------------------------
# S3 Buckets
# -----------------------------------------------------------------------------

# Random suffix for globally unique bucket names
resource "random_id" "frontend_bucket" {
  byte_length = 4
}

# Frontend bucket for React SPA
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.app_name}-frontend-${random_id.frontend_bucket.hex}"
  force_destroy = true

  tags = {
    Name = "${var.app_name}-frontend"
  }
}

# Block all public access to frontend bucket (CloudFront accesses via OAC)
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Backup bucket for database dumps
resource "aws_s3_bucket" "backups" {
  bucket        = "${var.app_name}-backups-prod"
  force_destroy = true

  tags = {
    Name = "${var.app_name}-backups"
  }
}

# Block all public access to backup bucket
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule for backups - delete after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "delete-old-backups"
    status = "Enabled"
    filter {
    }
    expiration {
      days = 30
    }
  }
}

# CloudFront Origin Access Control for frontend bucket
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.app_name}-frontend-oac"
  description                       = "OAC for HuntBoard frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy allowing CloudFront OAC read access
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}
