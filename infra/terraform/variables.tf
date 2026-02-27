variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "huntboard"
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "huntboard.app"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude AI"
  type        = string
  sensitive   = true
}

variable "serpapi_key" {
  description = "SerpAPI key for Google Jobs scraping"
  type        = string
  sensitive   = true
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t4g.micro"
}

variable "ssh_key_name" {
  description = "Name of the EC2 SSH key pair"
  type        = string
  default     = "huntboard-ec2"
}

variable "my_ip" {
  description = "Your public IP for SSH access, e.g. 1.2.3.4/32"
  type        = string
}
