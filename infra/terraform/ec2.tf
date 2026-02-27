# -----------------------------------------------------------------------------
# EC2 Instance - Main compute for backend + PostgreSQL
# -----------------------------------------------------------------------------

# Get latest Amazon Linux 2023 ARM64 AMI
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

# EC2 instance
resource "aws_instance" "main" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.ssh_key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh", {
    region             = var.aws_region
    ecr_repo           = aws_ecr_repository.backend.repository_url
    resume_bucket      = "huntboard-resumes-prod"
    backup_bucket      = aws_s3_bucket.backups.id
    domain_name        = var.domain_name
    cognito_user_pool_id = aws_cognito_user_pool.main.id
    cognito_client_id    = aws_cognito_user_pool_client.web.id
  }))

  tags = {
    Name = "${var.app_name}-prod"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

# Elastic IP for static public IP
resource "aws_eip" "main" {
  domain = "vpc"

  tags = {
    Name = "${var.app_name}-eip"
  }
}

# Associate EIP with EC2 instance
resource "aws_eip_association" "main" {
  instance_id   = aws_instance.main.id
  allocation_id = aws_eip.main.id
}
