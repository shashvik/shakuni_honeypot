# Terraform configuration for Medium Interaction GitHub Honeypot

# --- GitHub Flow S3 Bucket & Object ---

resource "aws_s3_bucket" "github_logs_bucket" {
  count = var.deploy_s3_buckets ? 1 : 0 # Assuming this should be tied to the general S3 deployment flag

  bucket = "github-logs-${random_id.suffix.hex}" # Add random suffix for uniqueness
  tags = {
    Name        = "GitHub Action Logs"
    Environment = "Automation"
    Purpose     = "Logging"
  }
}

resource "aws_s3_object" "userlogs_csv" {
  count = var.deploy_s3_buckets ? 1 : 0 # Tie to bucket creation

  bucket = aws_s3_bucket.github_logs_bucket[0].id
  key    = "userlogs.csv"
  content = <<EOF
UserID,Timestamp,Action
user1,2023-10-27T10:00:00Z,Login
user2,2023-10-27T10:05:00Z,UpdateProfile
user1,2023-10-27T10:15:00Z,Logout
EOF
  content_type = "text/csv"

  tags = {
    Name = "User Activity Log"
  }
}

# --- GitHub Flow IAM User & Policy ---
resource "aws_iam_user" "github_automation_user" {
  count = var.deploy_iam_users ? 1 : 0 # Assuming this should be tied to the general user deployment flag

  name = "github_automation_user_${random_id.suffix.hex}"
  tags = {
    Description = "User for GitHub automation tasks"
  }
}

resource "aws_iam_access_key" "github_automation_user_key" {
  count = var.deploy_iam_users ? 1 : 0 # Tie key creation to user creation

  user = aws_iam_user.github_automation_user[0].name
}

# Policy to allow reading from the github_logs bucket
resource "aws_iam_policy" "github_automation_s3_policy" {
  count = var.deploy_iam_users ? 1 : 0 # Tie policy creation to user creation

  name        = "GitHubAutomationS3ReadPolicy-${random_id.suffix.hex}"
  description = "Allow GetObject access to the GitHub logs bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject"
        ]
        Effect   = "Allow"
        # Ensure this resource reference is valid after splitting files
        Resource = "${var.deploy_s3_buckets ? aws_s3_bucket.github_logs_bucket[0].arn : ""}/*"
      },
    ]
  })
}

# Attach the policy to the user
resource "aws_iam_user_policy_attachment" "github_automation_s3_attach" {
  count = var.deploy_iam_users ? 1 : 0 # Tie attachment to user creation

  user       = aws_iam_user.github_automation_user[0].name
  policy_arn = aws_iam_policy.github_automation_s3_policy[0].arn
}

# --- GitHub Flow Lambda Function & Role ---

# Role for GitHub Automation Lambda
resource "aws_iam_role" "github_automation_lambda_role" {
  count = var.deploy_lambdas ? 1 : 0 # Assuming this should be tied to the general lambda deployment flag

  name = "GitHubAutomationLambdaRole-${random_id.suffix.hex}"
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
  # No permissions attached initially
  tags = {
    Description = "Execution role for the GitHub automation Lambda function"
  }
}

# GitHub Automation Lambda Function
resource "aws_lambda_function" "github_automation_lambda" {
  count = var.deploy_lambdas ? 1 : 0 # Tie to general lambda deployment flag

  filename      = "lambda_payloads/dummy_lambda.zip" # Using dummy payload
  function_name = "github-automation-lambda-${random_id.suffix.hex}"
  role          = aws_iam_role.github_automation_lambda_role[0].arn
  handler       = "index.handler"
  runtime       = "python3.9"
  source_code_hash = filebase64sha256("lambda_payloads/dummy_lambda.zip")

  # WARNING: Storing secrets directly in environment variables is insecure.
  # Consider using AWS Secrets Manager or Parameter Store for production.
  environment {
    variables = {
      # Ensure these resource references are valid after splitting files
      GITHUB_AUTOMATION_ACCESS_KEY_ID     = var.deploy_iam_users ? aws_iam_access_key.github_automation_user_key[0].id : ""
      GITHUB_AUTOMATION_SECRET_ACCESS_KEY = var.deploy_iam_users ? aws_iam_access_key.github_automation_user_key[0].secret : ""
      BUCKET_NAME                         = var.deploy_s3_buckets ? aws_s3_bucket.github_logs_bucket[0].bucket : "" # Example: Pass bucket name if needed
    }
  }

  tags = {
    Description = "Lambda function for GitHub automation tasks"
  }

  # Ensure the access key and bucket are created before the lambda that uses them
  depends_on = [
    # Terraform implicitly handles dependencies based on resource count
    aws_iam_access_key.github_automation_user_key,
    aws_s3_bucket.github_logs_bucket
  ]
}