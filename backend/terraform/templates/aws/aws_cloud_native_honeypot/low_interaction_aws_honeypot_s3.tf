# Terraform configuration for Low Interaction AWS Honeypot - S3 Resources

# --- Other S3 Buckets ---

resource "aws_s3_bucket" "prod_backups_financial" {
  count = var.deploy_s3_buckets ? 1 : 0

  bucket = "prod-backups-financial-data-${random_id.suffix.hex}" # Add random suffix for uniqueness
  tags = {
    Name        = "Production Financial Backups"
    Environment = "Production"
    Criticality = "High"
  }
}

resource "aws_s3_object" "prod_backup_report" {
  count = var.deploy_s3_buckets ? 1 : 0

  bucket = aws_s3_bucket.prod_backups_financial[0].id
  key    = "reports/prod_backup_report_q1.txt"
  source = "dummy_data/prod_backup_report_q1.txt" # Relative path within the template dir
  content_type = "text/plain"

  tags = {
    Description = "Sample production backup report"
  }
}


resource "aws_s3_bucket" "customer_pii_archive" {
  count = var.deploy_s3_buckets ? 1 : 0

  bucket = "customer-pii-archive-${random_id.suffix.hex}" # Add random suffix for uniqueness
  tags = {
    Name        = "Customer PII Archive"
    Environment = "Archive"
    Sensitivity = "Confidential"
  }
}

resource "aws_s3_object" "customer_pii_record" {
  count = var.deploy_s3_buckets ? 1 : 0

  bucket = aws_s3_bucket.customer_pii_archive[0].id
  key    = "records/customer_record_12345.json"
  source = "dummy_data/customer_record_12345.json" # Relative path within the template dir
  content_type = "application/json"

  tags = {
    Description = "Sample archived customer PII record"
  }
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variable deploy_s3_buckets is defined in variables.tf
# Note: Ensure resource random_id.suffix is defined in low_interaction_aws_honeypot_main.tf