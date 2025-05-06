variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1" # Or fetch from a central config
}

variable "environment" {
  description = "The deployment environment (e.g., dev, prod)."
  type        = string
  default     = "development"
}

variable "purpose" {
  description = "The purpose of these resources."
  type        = string
  default     = "web-honeypot"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.208.0.0/16"
}

variable "subnet_cidr" {
  description = "The CIDR block for the public subnet."
  type        = string
  default     = "10.208.1.0/24"
}

# SSH key variables removed as we're using user_data instead of SSH for deployment

variable "api_endpoint" {
  description = "The endpoint URL for the API to send captured credentials."
  type        = string
  default     = "http://localhost:5000/api/logs/ingest"
}

variable "api_key" {
  description = "The API key for authentication with the API endpoint."
  type        = string
  sensitive   = true
  # No default - must be provided by the user
}