# Terraform configuration for Low Interaction AWS Honeypot - Event Forwarding via EventBridge and Lambda

# --- Data source to get current AWS Account ID --- 
data "aws_caller_identity" "current" {}

# --- IAM Role for Event Handler Lambda --- 
resource "aws_iam_role" "event_handler_lambda_role" {
  name = "EventHandlerLambdaRole-${random_id.suffix.hex}"

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
    Description = "IAM role for Honeypot Event Handler Lambda function execution"
    Environment = "Honeypot"
  }
}

# --- IAM Policy for Lambda Logging --- 
resource "aws_iam_policy" "event_handler_lambda_logging_policy" {
  name        = "EventHandlerLambdaLoggingPolicy-${random_id.suffix.hex}"
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
        # Restrict resource to the specific log group for better security
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/honeypot-event-handler-${random_id.suffix.hex}:*"
      }
    ]
  })

  tags = {
    Purpose = "Lambda Logging"
  }
}

# --- Attach Logging Policy to Lambda Role --- 
resource "aws_iam_role_policy_attachment" "event_handler_lambda_logging_attach" {
  role       = aws_iam_role.event_handler_lambda_role.name
  policy_arn = aws_iam_policy.event_handler_lambda_logging_policy.arn
}

# --- Event Handler Lambda Function --- 
resource "aws_lambda_function" "honeypot_event_handler" {
  filename         = "lambda_payloads/event_handler_payload.zip" # Path relative to the template directory
  function_name    = "honeypot-event-handler-${random_id.suffix.hex}"
  role             = aws_iam_role.event_handler_lambda_role.arn
  handler          = "event_handler.handler" # Corresponds to event_handler.py -> handler function
  source_code_hash = filebase64sha256("lambda_payloads/event_handler_payload.zip")
  runtime          = "python3.9" # Match the runtime used in the lambda code
  timeout          = 30 # Adjust as needed

  environment {
    variables = {
      SHAKUNI_API_ENDPOINT_URL = var.shakuni_api_endpoint_url
      SHAKUNI_API_KEY          = var.shakuni_api_key # Consider using Secrets Manager for production
    }
  }

  tags = {
    Description = "Lambda function to handle honeypot events and forward to Shakuni API"
    Environment = "Honeypot"
  }

  # Ensure the role is created before the function
  depends_on = [aws_iam_role.event_handler_lambda_role, aws_iam_role_policy_attachment.event_handler_lambda_logging_attach]
}

# --- EventBridge Rule for S3 Access --- 
resource "aws_cloudwatch_event_rule" "s3_honeypot_access_rule" {
  # Trigger if S3 buckets are deployed
  count = var.deploy_s3_buckets ? 1 : 0

  name        = "s3-honeypot-access-rule-${random_id.suffix.hex}"
  description = "Capture S3 object-level API calls for honeypot buckets"

  event_pattern = jsonencode({
    source = ["aws.s3"],
    detail = {
      # Optionally filter specific events, or capture all for the buckets
      requestParameters = {
        bucketName = distinct(compact([
          # Use conditional resource referencing
          var.deploy_s3_buckets ? aws_s3_bucket.prod_backups_financial[0].id : null,
          var.deploy_s3_buckets ? aws_s3_bucket.customer_pii_archive[0].id : null,
          var.deploy_s3_buckets ? aws_s3_bucket.github_logs_bucket[0].id : null
        ]))
      }
    }
  })

  tags = {
    Description = "Rule to capture S3 honeypot access"
    Environment = "Honeypot"
  }

  depends_on = [
    aws_s3_bucket.prod_backups_financial,
    aws_s3_bucket.customer_pii_archive,
    aws_s3_bucket.github_logs_bucket
  ]
}

# --- Lambda Permission for S3 EventBridge Rule --- 
resource "aws_lambda_permission" "allow_s3_eventbridge" {
  count = var.deploy_s3_buckets ? 1 : 0 # Match the rule's count

  statement_id  = "AllowExecutionFromS3EventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.honeypot_event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.s3_honeypot_access_rule[0].arn
}

# --- EventBridge Target (Lambda) for S3 Events --- 
resource "aws_cloudwatch_event_target" "s3_events_to_lambda_target" {
  count = var.deploy_s3_buckets ? 1 : 0 # Match the rule's count

  rule      = aws_cloudwatch_event_rule.s3_honeypot_access_rule[0].name
  target_id = "SendS3HoneypotEventsToLambda-${random_id.suffix.hex}"
  arn       = aws_lambda_function.honeypot_event_handler.arn

  # No role_arn needed; permissions handled by aws_lambda_permission
}



# --- EventBridge Rule for IAM Events --- 
resource "aws_cloudwatch_event_rule" "iam_honeypot_events_rule" {
  count = var.deploy_iam_roles || var.deploy_iam_users ? 1 : 0

  name        = "iam-honeypot-events-rule-${random_id.suffix.hex}"
  description = "Capture all IAM events for honeypot users/roles"

  event_pattern = jsonencode({
    source      = ["aws.iam"],
    detail-type = ["AWS API Call via CloudTrail"],
    # Filter based on the specific IAM users and roles created
    detail = {
      userIdentity = {
        arn = distinct(compact(concat(
          # Roles
          var.deploy_lambdas ? [aws_iam_role.lambda_exec_role[0].arn] : [],
          var.deploy_iam_roles ? [aws_iam_role.admin_access_role[0].arn] : [],
          var.deploy_iam_roles ? [aws_iam_role.database_superuser_role[0].arn] : [],
          var.deploy_lambdas ? [aws_iam_role.process_payments_lambda_role[0].arn] : [],
          var.deploy_lambdas ? [aws_iam_role.sync_user_data_lambda_role[0].arn] : [],
          var.deploy_lambdas ? [aws_iam_role.github_automation_lambda_role[0].arn] : [],
          # Users (Note: CloudTrail events often show assumed role ARN in userIdentity, 
          # but direct user actions might use the user ARN. Including both for broader capture initially.)
          var.deploy_iam_users ? [aws_iam_user.root_admin_user[0].arn] : [],
          var.deploy_iam_users ? [aws_iam_user.billing_service_account[0].arn] : [],
          var.deploy_iam_users ? [aws_iam_user.github_automation_user[0].arn] : []
        )))
      }
    }
  })

  tags = {
    Description = "Rule to capture IAM honeypot events"
    Environment = "Honeypot"
  }

  depends_on = [
    # Add dependencies for all potentially referenced IAM resources
    aws_iam_role.lambda_exec_role,
    aws_iam_role.admin_access_role,
    aws_iam_role.database_superuser_role,
    aws_iam_role.process_payments_lambda_role,
    aws_iam_role.sync_user_data_lambda_role,
    aws_iam_role.github_automation_lambda_role,
    aws_iam_user.root_admin_user,
    aws_iam_user.billing_service_account,
    aws_iam_user.github_automation_user
  ]
}

# --- Lambda Permission for IAM EventBridge Rule --- 
resource "aws_lambda_permission" "allow_iam_eventbridge" {
  count = var.deploy_iam_roles || var.deploy_iam_users ? 1 : 0 # Match the rule's count

  statement_id  = "AllowExecutionFromIAMEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.honeypot_event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.iam_honeypot_events_rule[0].arn
}

# --- EventBridge Target for IAM Events --- 
resource "aws_cloudwatch_event_target" "iam_events_to_lambda_target" {
  count = var.deploy_iam_roles || var.deploy_iam_users ? 1 : 0 # Match the rule's count

  rule      = aws_cloudwatch_event_rule.iam_honeypot_events_rule[0].name
  target_id = "SendIAMHoneypotEventsToLambda-${random_id.suffix.hex}"
  arn       = aws_lambda_function.honeypot_event_handler.arn
}

# --- EventBridge Rule for KMS Events --- 
resource "aws_cloudwatch_event_rule" "kms_honeypot_events_rule" {
  count = var.deploy_kms_keys ? 1 : 0

  name        = "kms-honeypot-events-rule-${random_id.suffix.hex}"
  description = "Capture all KMS events for honeypot keys"

  event_pattern = jsonencode({
    source      = ["aws.kms"],
    detail-type = ["AWS API Call via CloudTrail"],
    detail = {
      requestParameters = {
        # Filter by Key ARN or Key ID
        keyId = [aws_kms_key.data_encryption_key[0].arn, aws_kms_key.data_encryption_key[0].key_id]
      }
    }
  })

  tags = {
    Description = "Rule to capture KMS honeypot events"
    Environment = "Honeypot"
  }

  depends_on = [aws_kms_key.data_encryption_key]
}

# --- Lambda Permission for KMS EventBridge Rule --- 
resource "aws_lambda_permission" "allow_kms_eventbridge" {
  count = var.deploy_kms_keys ? 1 : 0 # Match the rule's count

  statement_id  = "AllowExecutionFromKMSEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.honeypot_event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.kms_honeypot_events_rule[0].arn
}

# --- EventBridge Target for KMS Events --- 
resource "aws_cloudwatch_event_target" "kms_events_to_lambda_target" {
  count = var.deploy_kms_keys ? 1 : 0 # Match the rule's count

  rule      = aws_cloudwatch_event_rule.kms_honeypot_events_rule[0].name
  target_id = "SendKMSHoneypotEventsToLambda-${random_id.suffix.hex}"
  arn       = aws_lambda_function.honeypot_event_handler.arn
}

# --- EventBridge Rule for Lambda Events --- 
resource "aws_cloudwatch_event_rule" "lambda_honeypot_events_rule" {
  count = var.deploy_lambdas ? 1 : 0

  name        = "lambda-honeypot-events-rule-${random_id.suffix.hex}"
  description = "Capture all Lambda events for honeypot functions"

  event_pattern = jsonencode({
    source      = ["aws.lambda"],
    detail-type = ["AWS API Call via CloudTrail"],
    detail = {
      requestParameters = {
        functionName = distinct(compact([
          # Use function names for filtering
          aws_lambda_function.sensitive_data_processor[0].function_name,
          aws_lambda_function.process_payments_lambda[0].function_name,
          aws_lambda_function.github_automation_lambda[0].function_name
        ]))
      }
    }
  })

  tags = {
    Description = "Rule to capture Lambda honeypot events"
    Environment = "Honeypot"
  }

  depends_on = [
    aws_lambda_function.sensitive_data_processor,
    aws_lambda_function.process_payments_lambda,
    aws_lambda_function.github_automation_lambda
  ]
}

# --- Lambda Permission for Lambda EventBridge Rule --- 
resource "aws_lambda_permission" "allow_lambda_eventbridge" {
  count = var.deploy_lambdas ? 1 : 0 # Match the rule's count

  statement_id  = "AllowExecutionFromLambdaEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.honeypot_event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_honeypot_events_rule[0].arn
}

# --- EventBridge Target for Lambda Events --- 
resource "aws_cloudwatch_event_target" "lambda_events_to_lambda_target" {
  count = var.deploy_lambdas ? 1 : 0 # Match the rule's count

  rule      = aws_cloudwatch_event_rule.lambda_honeypot_events_rule[0].name
  target_id = "SendLambdaHoneypotEventsToLambda-${random_id.suffix.hex}"
  arn       = aws_lambda_function.honeypot_event_handler.arn
}

# --- EventBridge Rule for Secrets Manager Events --- 
resource "aws_cloudwatch_event_rule" "secretsmanager_honeypot_events_rule" {
  count = var.deploy_secrets ? 1 : 0

  name        = "secretsmanager-honeypot-events-rule-${random_id.suffix.hex}"
  description = "Capture all Secrets Manager events for honeypot secrets"

  event_pattern = jsonencode({
    source      = ["aws.secretsmanager"],
    detail-type = ["AWS API Call via CloudTrail"],
    detail = {
      requestParameters = {
        secretId = distinct(compact([
          # Filter by Secret ARN or Name
          aws_secretsmanager_secret.rds_master_credentials[0].arn,
          aws_secretsmanager_secret.rds_master_credentials[0].name,
          aws_secretsmanager_secret.api_key_payment_gateway[0].arn,
          aws_secretsmanager_secret.api_key_payment_gateway[0].name
        ]))
      }
    }
  })

  tags = {
    Description = "Rule to capture Secrets Manager honeypot events"
    Environment = "Honeypot"
  }

  depends_on = [
    aws_secretsmanager_secret.rds_master_credentials,
    aws_secretsmanager_secret.api_key_payment_gateway
  ]
}

# --- Lambda Permission for Secrets Manager EventBridge Rule --- 
resource "aws_lambda_permission" "allow_secretsmanager_eventbridge" {
  count = var.deploy_secrets ? 1 : 0 # Match the rule's count

  statement_id  = "AllowExecutionFromSecretsManagerEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.honeypot_event_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.secretsmanager_honeypot_events_rule[0].arn
}

# --- EventBridge Target for Secrets Manager Events --- 
resource "aws_cloudwatch_event_target" "secretsmanager_events_to_lambda_target" {
  count = var.deploy_secrets ? 1 : 0 # Match the rule's count

  rule      = aws_cloudwatch_event_rule.secretsmanager_honeypot_events_rule[0].name
  target_id = "SendSecretsManagerHoneypotEventsToLambda-${random_id.suffix.hex}"
  arn       = aws_lambda_function.honeypot_event_handler.arn
}

# --- Variables --- 
# Note: Ensure variable 'aws_region' is defined in variables.tf
# Note: Ensure resource 'random_id.suffix' is defined in low_interaction_aws_honeypot_main.tf
# Note: Ensure variables for deployed resources (e.g., deploy_s3_buckets, deploy_iam_roles, etc.) are defined in variables.tf
# Note: Ensure variables 'shakuni_api_endpoint_url' and 'shakuni_api_key' are defined in variables.tf

# --- Outputs ---
output "honeypot_event_handler_lambda_arn" {
  description = "The ARN of the Lambda function handling honeypot events."
  value       = aws_lambda_function.honeypot_event_handler.arn
}