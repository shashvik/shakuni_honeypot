# Variables for honeypot S3 bucket Terraform configuration

variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "honeypot_bucket_prefix" {
  description = "Prefix for the honeypot S3 bucket name"
  type        = string
  default     = "honeypot"
}

variable "environment" {
  description = "Environment tag for resources"
  type        = string
  default     = "Security"
}

variable "purpose" {
  description = "Purpose tag for resources"
  type        = string
  default     = "Deception"
}