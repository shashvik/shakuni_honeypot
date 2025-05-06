# Terraform configuration for Low Interaction AWS Honeypot - Lambda Resources

# --- Lambda Function 1 (Original Honeypot) --- (Only if deployed)
# This Lambda function simulates processing sensitive data.
resource "aws_lambda_function" "sensitive_data_processor" {
  count = var.deploy_lambdas ? 1 : 0

  filename      = "dummy_data/lambda_function.zip" # Path relative to the template directory
  function_name = "sensitive-data-processor-${random_id.suffix.hex}"
  role          = aws_iam_role.lambda_exec_role[0].arn # Assumes role is defined in iam.tf
  handler       = "index.handler" # Assuming Python handler
  runtime       = "python3.9"
  source_code_hash = filebase64sha256("dummy_data/lambda_function.zip")

  tags = {
    Description = "Honeypot Lambda function simulating sensitive data processing"
    Environment = "Honeypot"
  }
}

# --- Other Lambda Functions (Minimal) ---

# Role for Lambda 2
resource "aws_iam_role" "process_payments_lambda_role" {
  count = var.deploy_lambdas ? 1 : 0

  name = "ProcessPaymentsLambdaRole-${random_id.suffix.hex}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
  # No permissions attached
  tags = {
    Description = "Execution role for the process payments Lambda function"
  }
}

# Lambda Function 2
resource "aws_lambda_function" "process_payments_lambda" {
  count = var.deploy_lambdas ? 1 : 0

  filename      = "lambda_payloads/dummy_lambda.zip" # Assumes this exists relative to the template dir
  function_name = "process-payments-lambda-${random_id.suffix.hex}"
  role          = aws_iam_role.process_payments_lambda_role[0].arn
  handler       = "index.handler"
  runtime       = "python3.9"
  source_code_hash = filebase64sha256("lambda_payloads/dummy_lambda.zip") # Assuming path relative to template dir

  tags = {
    Description = "Lambda function to handle payment processing events"
  }
}

# Role for Lambda 3 (Placeholder from original input, needs function)
resource "aws_iam_role" "sync_user_data_lambda_role" {
  count = var.deploy_lambdas ? 1 : 0

  name = "SyncUserDataLambdaRole-${random_id.suffix.hex}"
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
  # No permissions attached
  tags = {
    Description = "Execution role for the sync user data Lambda function"
  }
}

# --- Variables --- (Defined in variables.tf)
# Note: Ensure variable deploy_lambdas is defined in variables.tf
# Note: Ensure resource random_id.suffix is defined in low_interaction_aws_honeypot_main.tf
# Note: Ensure resource aws_iam_role.lambda_execution_role is defined in low_interaction_aws_honeypot_iam.tf