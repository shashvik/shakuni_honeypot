terraform {
  backend "s3" {
    # Bucket name will be configured dynamically during init
    # bucket = "your-tfstate-bucket-name"
    key    = "web_honeypot/terraform.tfstate"
    # Region will be configured dynamically during init
    # region = "us-east-1"
  }
}