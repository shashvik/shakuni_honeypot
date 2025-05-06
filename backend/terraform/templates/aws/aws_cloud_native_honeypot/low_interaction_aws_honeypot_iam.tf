# Terraform configuration for Low Interaction AWS Honeypot - IAM Resources

# --- IAM Role for Lambda --- (Only if Lambda is deployed)
resource "aws_iam_role" "lambda_exec_role" {
  count = var.deploy_lambdas ? 1 : 0

  name = "lambda-exec-role-${random_id.suffix.hex}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Description = "IAM role for Lambda function execution"
  }
}

# --- IAM Policy for Lambda --- (Only if Lambda is deployed)
resource "aws_iam_policy" "lambda_logging_policy" {
  count = var.deploy_lambdas ? 1 : 0

  name        = "lambda-logging-policy-${random_id.suffix.hex}"
  description = "Policy to allow Lambda to write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*" # Consider restricting this further
      }
    ]
  })

  tags = {
    Purpose = "Lambda Logging"
  }
}

# --- Attach Policy to Role --- (Only if Lambda is deployed)
resource "aws_iam_role_policy_attachment" "lambda_logging_attach" {
  count = var.deploy_lambdas ? 1 : 0

  role       = aws_iam_role.lambda_exec_role[0].name
  policy_arn = aws_iam_policy.lambda_logging_policy[0].arn
}


# --- Other IAM Roles (No Permissions) ---
resource "aws_iam_role" "admin_access_role" {
  count = var.deploy_iam_roles ? 1 : 0

  name = "AdminAccessRole-${random_id.suffix.hex}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Deny" # Deny assumption by default
        Principal = {
          AWS = "*"
        }
      },
    ]
  })
  tags = {
    Description = "Role intended for administrative access"
  }
}

resource "aws_iam_role" "database_superuser_role" {
  count = var.deploy_iam_roles ? 1 : 0

  name = "DatabaseSuperUserRole-${random_id.suffix.hex}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Deny" # Deny assumption by default
        Principal = {
          AWS = "*"
        }
      },
    ]
  })
  tags = {
    Description = "Role intended for database superuser access"
  }
}

# --- Other IAM Users (No Permissions) ---
resource "aws_iam_user" "root_admin_user" {
  count = var.deploy_iam_users ? 1 : 0

  name = "root_admin_user_${random_id.suffix.hex}"
  tags = {
    Description = "Primary administrative user account"
  }
}

resource "aws_iam_user" "billing_service_account" {
  count = var.deploy_iam_users ? 1 : 0

  name = "billing_service_account_${random_id.suffix.hex}"
  tags = {
    Description = "Service account for billing system integration"
  }
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variables deploy_lambdas, deploy_iam_roles, deploy_iam_users are defined in variables.tf
# Note: Ensure resource random_id.suffix is defined in low_interaction_aws_honeypot_main.tf