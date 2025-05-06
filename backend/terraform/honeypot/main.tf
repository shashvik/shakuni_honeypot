# Terraform configuration for honeypot S3 bucket

provider "aws" {
  region = var.aws_region
}

# Configure Terraform backend for remote state
terraform {
  backend "s3" {
    # These values will be populated dynamically during terraform init
    # bucket = "configured-bucket-name"
    key    = "honeypot/terraform.tfstate"
    # region will be set during initialization
  }
}

# Create honeypot S3 bucket
resource "aws_s3_bucket" "honeypot" {
  bucket = "${var.honeypot_bucket_prefix}-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  
  tags = {
    Name        = "Honeypot Bucket"
    Environment = var.environment
    Purpose     = var.purpose
  }
}

# Configure bucket access logging
resource "aws_s3_bucket_logging" "honeypot_logging" {
  bucket = aws_s3_bucket.honeypot.id

  target_bucket = aws_s3_bucket.honeypot.id
  target_prefix = "access-logs/"
}

# Output the bucket name
output "honeypot_bucket_name" {
  value       = aws_s3_bucket.honeypot.bucket
  description = "The name of the honeypot S3 bucket"
}

output "honeypot_bucket_arn" {
  value       = aws_s3_bucket.honeypot.arn
  description = "The ARN of the honeypot S3 bucket"
}