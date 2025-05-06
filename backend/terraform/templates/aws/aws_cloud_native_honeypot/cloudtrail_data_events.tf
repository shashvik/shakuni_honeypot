# Terraform configuration for AWS CloudTrail Data Events Monitoring

# --- CloudTrail for Data Events ---
resource "aws_cloudtrail" "honeypot_data_events" {
  count = var.deploy_cloudtrail_monitoring ? 1 : 0

  name                          = var.cloudtrail_name
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs[0].id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
  enable_log_file_validation    = true

  # Configure data event logging for S3 buckets
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    # Monitor all S3 honeypot buckets if they are deployed
    dynamic "data_resource" {
  for_each = var.deploy_s3_buckets ? [
    aws_s3_bucket.prod_backups_financial[0].bucket,
    aws_s3_bucket.customer_pii_archive[0].bucket,
    aws_s3_bucket.github_logs_bucket[0].bucket
  ] : []

  content {
    type   = "AWS::S3::Object"
    values = ["arn:aws:s3:::${data_resource.value}/"]
  }
}

  }

  # Configure data event logging for Lambda functions
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    # Monitor all Lambda honeypot functions if they are deployed
    dynamic "data_resource" {
      for_each = var.deploy_lambdas ? [
        aws_lambda_function.sensitive_data_processor[0].arn,
        aws_lambda_function.process_payments_lambda[0].arn,
        aws_lambda_function.github_automation_lambda[0].arn
      ] : []
      
      content {
        type   = "AWS::Lambda::Function"
        values = [data_resource.value]
      }
    }
  }

  depends_on = [
    aws_s3_bucket_policy.cloudtrail_bucket_policy
  ]

  tags = {
    Name        = var.cloudtrail_name
    Environment = "Honeypot"
    Purpose     = "Security Monitoring"
  }
}

# --- S3 Bucket for CloudTrail Logs ---
resource "aws_s3_bucket" "cloudtrail_logs" {
  count = var.deploy_cloudtrail_monitoring ? 1 : 0

  bucket = "cloudtrail-logs-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Name        = "CloudTrail Logs Bucket"
    Environment = "Honeypot"
  }
}

# --- S3 Bucket Policy for CloudTrail ---
resource "aws_s3_bucket_policy" "cloudtrail_bucket_policy" {
  count = var.deploy_cloudtrail_monitoring ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail_logs[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudTrailAclCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.cloudtrail_logs[0].arn
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudtrail_logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variable deploy_cloudtrail_monitoring is defined in variables.tf
# Note: Ensure variable cloudtrail_name is defined in variables.tf
# Note: Ensure resource random_id.suffix is defined in low_interaction_aws_honeypot_main.tf
# Note: Ensure S3 buckets and Lambda functions are defined in their respective files