# Terraform configuration for Low Interaction AWS Honeypot - Secrets Manager Resources

# --- Secrets Manager Secrets ---
resource "aws_secretsmanager_secret" "rds_master_credentials" {
  count = var.deploy_secrets ? 1 : 0

  name = "rds/master-credential-${random_id.suffix.hex}"
  description = "Stores master credentials for the primary RDS instance"
  tags = {
    Environment = "Production"
  }
}

resource "aws_secretsmanager_secret_version" "rds_master_credentials_version" {
  count = var.deploy_secrets ? 1 : 0

  secret_id     = aws_secretsmanager_secret.rds_master_credentials[0].id
  secret_string = jsonencode({
    username = "db_admin"
    password = "P@sswOrd${random_id.suffix.hex}!Complex"
  })
}

resource "aws_secretsmanager_secret" "api_key_payment_gateway" {
  count = var.deploy_secrets ? 1 : 0

  name = "api/payments-gateway-key-${random_id.suffix.hex}"
  description = "API Key for integrating with the payment gateway provider"
  tags = {
    Service = "PaymentGateway"
  }
}

resource "aws_secretsmanager_secret_version" "api_key_payment_gateway_version" {
  count = var.deploy_secrets ? 1 : 0

  secret_id     = aws_secretsmanager_secret.api_key_payment_gateway[0].id
  secret_string = "pk_live_7a8b3c4d${random_id.suffix.hex}e9f0g1h2"
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variable deploy_secrets is defined in variables.tf
# Note: Ensure resource random_id.suffix is defined in low_interaction_aws_honeypot_main.tf