# --- General Deployment Flags ---

variable "shakuni_api_endpoint_url" {
  description = "The URL of the Shakuni API endpoint for log ingestion."
  type        = string
  default     = "" # Default added to allow destroy without providing value
  # Sensitive data, consider using environment variables or tfvars file for production
}

variable "shakuni_api_key" {
  description = "The API key for authenticating with the Shakuni API endpoint."
  type        = string
  sensitive   = true # Mark as sensitive to prevent exposure in logs/outputs
  default     = "" # Default added to allow destroy without providing value
  # Sensitive data, consider using environment variables or tfvars file for production
}

variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1" # Or fetch from a central config
}

variable "honeypot_bucket_prefix" {
  description = "Prefix for the honeypot S3 bucket name."
  type        = string
  default     = "shakuni-honeypot-storage"
}

variable "environment" {
  description = "The deployment environment (e.g., dev, prod)."
  type        = string
  default     = "development"
}

variable "purpose" {
  description = "The purpose of these resources."
  type        = string
  default     = "storage-honeypot"
}

variable "deploy_s3_buckets" {
  description = "Whether to deploy the S3 bucket honeypots."
  type        = bool
  default     = true
}

variable "deploy_iam_roles" {
  description = "Whether to deploy the IAM role honeypots."
  type        = bool
  default     = true
}

variable "deploy_iam_users" {
  description = "Whether to deploy the IAM user honeypots."
  type        = bool
  default     = true
}

variable "deploy_secrets" {
  description = "Whether to deploy the Secrets Manager secret honeypots."
  type        = bool
  default     = true
}

variable "deploy_lambdas" {
  description = "Whether to deploy the Lambda function honeypots."
  type        = bool
  default     = true
}

variable "deploy_kms_keys" {
  description = "Whether to deploy the KMS key honeypot resources."
  type        = bool
  default     = false
}

variable "deploy_s3_event_monitoring" {
  description = "Whether to deploy the S3 event monitoring resources (EventBridge rule, SQS queue)."
  type        = bool
  default     = true # Set to true to enable by default, or false if preferred
}

variable "deploy_cloudtrail_monitoring" {
  description = "Whether to deploy CloudTrail for data events monitoring of S3 buckets and Lambda functions."
  type        = bool
  default     = true
}

variable "cloudtrail_name" {
  description = "Name for the CloudTrail that will monitor data events for honeypot resources."
  type        = string
  default     = "honeypot-data-events-trail"
}