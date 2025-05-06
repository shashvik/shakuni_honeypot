# Honeypot S3 Bucket Terraform Configuration

This Terraform configuration creates an AWS S3 bucket that serves as a honeypot for security monitoring and deception purposes.

## Overview

The configuration creates:

- An S3 bucket with a unique name (using timestamp)
- Access logging configuration for the bucket
- Proper tagging for identification

## Remote State

This configuration uses S3 as a backend for storing Terraform state. The S3 bucket name is configured through the Shakuni application settings page and is passed to Terraform during initialization.

## Deployment

The deployment is handled through the Shakuni application:

1. Configure the S3 bucket for remote state in the Settings page
2. Click the "Run Terraform Deployment" button in the Deployment page
3. The application will initialize Terraform with the configured S3 bucket
4. Terraform will create the honeypot S3 bucket

## Outputs

- `honeypot_bucket_name`: The name of the created S3 bucket
- `honeypot_bucket_arn`: The ARN of the created S3 bucket

## Requirements

- AWS credentials configured in the environment
- Terraform installed on the server
- Proper permissions to create S3 buckets

## Installation

Ensure Terraform is installed on the server where the Shakuni backend is running. You can download it from [Terraform's official website](https://www.terraform.io/downloads.html).

The backend application will use the `terraform` command to execute the deployment, so make sure it's available in the system PATH.