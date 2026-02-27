# -----------------------------------------------------------------------------
# IAM Role for EC2 Instance
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

# EC2 assume role policy
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# IAM role for EC2 instance
resource "aws_iam_role" "ec2" {
  name               = "${var.app_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = {
    Name = "${var.app_name}-ec2-role"
  }
}

# S3 policy - read/write to resume and backup buckets
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid = "S3ResumeAccess"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::huntboard-resumes-prod",
      "arn:aws:s3:::huntboard-resumes-prod/*"
    ]
  }

  statement {
    sid = "S3BackupAccess"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.backups.arn,
      "${aws_s3_bucket.backups.arn}/*"
    ]
  }
}

resource "aws_iam_role_policy" "s3_access" {
  name   = "${var.app_name}-s3-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.s3_access.json
}

# ECR policy - pull images
data "aws_iam_policy_document" "ecr_access" {
  statement {
    sid = "ECRAuth"
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = ["*"]
  }

  statement {
    sid = "ECRPull"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability"
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
}

resource "aws_iam_role_policy" "ecr_access" {
  name   = "${var.app_name}-ecr-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ecr_access.json
}

# Secrets Manager policy - read huntboard/* secrets
data "aws_iam_policy_document" "secrets_access" {
  statement {
    sid = "SecretsRead"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:huntboard/*"
    ]
  }
}

resource "aws_iam_role_policy" "secrets_access" {
  name   = "${var.app_name}-secrets-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.secrets_access.json
}

# CloudWatch Logs policy
data "aws_iam_policy_document" "cloudwatch_access" {
  statement {
    sid = "CloudWatchLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]
    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/huntboard/*"
    ]
  }
}

resource "aws_iam_role_policy" "cloudwatch_access" {
  name   = "${var.app_name}-cloudwatch-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.cloudwatch_access.json
}

# SES policy - send email digests
data "aws_iam_policy_document" "ses_access" {
  statement {
    sid = "SESSendEmail"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"]
    # Restrict to sending from huntboard.app domain
    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = ["*@huntboard.app"]
    }
  }
}

resource "aws_iam_role_policy" "ses_access" {
  name   = "${var.app_name}-ses-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ses_access.json
}

# Instance profile
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
