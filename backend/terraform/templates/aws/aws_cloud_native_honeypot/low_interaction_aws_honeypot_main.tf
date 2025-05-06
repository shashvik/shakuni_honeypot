# Terraform configuration for Low Interaction AWS Honeypot - Main

provider "aws" {
  region = var.aws_region
}

# --- Helper Resources ---
# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 8
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variables like aws_region are defined in variables.tf