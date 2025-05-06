# AWS Web Honeypot

This directory contains Terraform configuration and scripts to deploy a web honeypot on AWS. The honeypot serves a fake login page that captures credentials and forwards them to a specified API endpoint.

## Overview

The honeypot consists of:

1. An EC2 instance running Apache2 and PHP
2. A fake login page that looks legitimate
3. Backend code to capture and forward credentials
4. Log forwarding for Apache access logs

All captured data (credentials, IP addresses, user agents) is sent to the specified API endpoint.

## Prerequisites

- AWS account with appropriate permissions
- Terraform installed locally
- API endpoint to receive the captured data

## Configuration

### Required Variables

Before deploying, you need to set the following variables:

- `api_key`: Your API key for authentication with the endpoint

### Optional Variables

You can customize these variables if needed:

- `aws_region`: AWS region for deployment (default: us-east-1)
- `vpc_cidr`: CIDR block for the VPC (default: 10.208.0.0/16)
- `subnet_cidr`: CIDR block for the subnet (default: 10.208.1.0/24)
- `api_endpoint`: URL of the API endpoint (default: http://localhost:5000/api/logs/ingest)

## Deployment

1. Initialize Terraform:

```bash
terraform init
```

2. Create a `terraform.tfvars` file with your variable values:

```hcl
api_key = "YOUR_API_KEY"
# Optional: Customize other variables as needed
```

3. Plan the deployment:

```bash
terraform plan -out=honeypot.plan
```

4. Apply the configuration:

```bash
terraform apply honeypot.plan
```

5. After deployment, Terraform will output the public IP and DNS of your honeypot server.

## Customization

### Modifying the Login Page

You can customize the fake login page by editing the HTML in the `deploy_honeypot.sh` script. Look for the section that creates `/var/www/honeypot/index.html`.

### Changing Log Forwarding Frequency

By default, Apache logs are forwarded every 5 minutes. You can change this by modifying the cron job in the `deploy_honeypot.sh` script.

### Adding Additional Honeypot Features

You can extend the honeypot functionality by modifying the `deploy_honeypot.sh` script to include additional deceptive elements or tracking mechanisms.

## Security Considerations

- This honeypot is designed to be exposed to potential attackers, so it should be deployed in isolation from your production environments.
- No SSH access is configured, making the instance more secure by default.
- Regularly review the captured data and logs to monitor for potential threats.
- Consider implementing additional security measures like AWS WAF or CloudFront if needed.

## Cleanup

To destroy the deployed resources:

```bash
terraform destroy
```

## Troubleshooting

### Checking Logs

If the honeypot is not working as expected, you can check the logs through AWS CloudWatch or by using AWS Systems Manager Session Manager to access the instance without SSH:

- `/var/log/honeypot/credentials.log`: Captured credentials
- `/var/log/honeypot/api_responses.log`: API response logs
- `/var/log/honeypot/api_errors.log`: API error logs
- `/var/log/apache2/honeypot-access.log`: Apache access logs
- `/var/log/apache2/honeypot-error.log`: Apache error logs

### Common Issues

1. **API Connection Failures**: Ensure your API endpoint is accessible from the EC2 instance and that the API key is correct.
2. **Permission Issues**: Check that the Apache user has write permissions to the log directories.
3. **User Data Script Failures**: If the honeypot isn't working, check the EC2 instance's system log in the AWS Console to see if the user data script executed correctly.