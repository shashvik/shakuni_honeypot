# Web Honeypot Terraform Template

This Terraform template deploys the necessary AWS infrastructure for a high-interaction web honeypot.

## Important: Deployment Account Isolation

**This honeypot template is designed to be deployed in a separate, isolated AWS account.** It should NOT be deployed in the same AWS account as your production resources or the low/medium interaction honeypots (`aws_cloud_native_honeypot` template).

Deploying high-interaction honeypots in a dedicated account minimizes the potential blast radius if the honeypot environment is compromised.

## Managing Multi-Account Deployments

To deploy this template to its dedicated honeypot account and the `aws_cloud_native_honeypot` template to your primary/security account, you need to manage AWS credentials appropriately.

Terraform uses the AWS SDK's standard credential chain. Here are common methods:

1.  **AWS CLI Profiles:**
    *   Configure named profiles in your `~/.aws/credentials` and `~/.aws/config` files for each account (e.g., `production-account`, `honeypot-account`).
    *   Before running Terraform commands, set the `AWS_PROFILE` environment variable:

        *   **For the main honeypot (low/medium interaction):**
            ```bash
            export AWS_PROFILE=production-account
            cd /path/to/shakuni/backend/terraform/templates/aws/aws_cloud_native_honeypot
            terraform init
            terraform apply
            ```

        *   **For this web honeypot (high interaction):**
            ```bash
            export AWS_PROFILE=honeypot-account
            cd /path/to/shakuni/backend/terraform/templates/aws/web_honeypot
            terraform init
            terraform apply
            ```

2.  **Environment Variables:**
    *   Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally `AWS_SESSION_TOKEN` directly in your terminal session before running Terraform commands for the target account.

        *   **For the main honeypot (low/medium interaction):**
            ```bash
            export AWS_ACCESS_KEY_ID=YOUR_PROD_ACCESS_KEY
            export AWS_SECRET_ACCESS_KEY=YOUR_PROD_SECRET_KEY
            # export AWS_SESSION_TOKEN=YOUR_PROD_SESSION_TOKEN # If using temporary credentials
            cd /path/to/shakuni/backend/terraform/templates/aws/aws_cloud_native_honeypot
            terraform init
            terraform apply
            ```

        *   **For this web honeypot (high interaction):**
            ```bash
            export AWS_ACCESS_KEY_ID=YOUR_HONEYPOT_ACCESS_KEY
            export AWS_SECRET_ACCESS_KEY=YOUR_HONEYPOT_SECRET_KEY
            # export AWS_SESSION_TOKEN=YOUR_HONEYPOT_SESSION_TOKEN # If using temporary credentials
            cd /path/to/shakuni/backend/terraform/templates/aws/web_honeypot
            terraform init
            terraform apply
            ```

**Note:** Ensure that the Terraform backend configuration (e.g., in `backend.tf`) uses different keys or paths for each deployment to keep the state files separate.

## Usage

1.  Navigate to this directory (`web_honeypot`).
2.  Set your AWS credentials for the **isolated honeypot account** using one of the methods above.
3.  Initialize Terraform: `terraform init`
4.  Review the plan: `terraform plan`
5.  Apply the configuration: `terraform apply`