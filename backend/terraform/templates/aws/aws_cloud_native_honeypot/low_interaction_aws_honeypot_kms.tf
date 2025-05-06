# Terraform configuration for Low Interaction AWS Honeypot - KMS Resources

# --- KMS Key --- (Only if deployed)
resource "aws_kms_key" "data_encryption_key" {
  count = var.deploy_kms_keys ? 1 : 0

  description             = "KMS key for encrypting sensitive data - ${random_id.suffix.hex}"
  deletion_window_in_days = 7 # Minimum allowed value
  enable_key_rotation     = true

  tags = {
    Name        = "Data Encryption Key"
    Environment = "Shared"
    Purpose     = "Data Encryption"
  }
}

# --- KMS Alias --- (Only if deployed)
resource "aws_kms_alias" "data_encryption_key_alias" {
  count = var.deploy_kms_keys ? 1 : 0

  name          = "alias/data-encryption-key-${random_id.suffix.hex}"
  target_key_id = aws_kms_key.data_encryption_key[0].key_id

  # Ensure KMS key is created before the alias
  depends_on = [aws_kms_key.data_encryption_key]
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variable deploy_kms_keys is defined in variables.tf