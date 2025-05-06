provider "aws" {
  region = var.aws_region
}

# Define the VPC
resource "aws_vpc" "honeypot_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "honeypot-vpc"
  }
}

# Define the public subnet
resource "aws_subnet" "honeypot_public_subnet" {
  vpc_id                  = aws_vpc.honeypot_vpc.id
  cidr_block              = var.subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0] # Use the first available AZ

  tags = {
    Name = "honeypot-public-subnet"
  }
}

# Define the Internet Gateway
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.honeypot_vpc.id

  tags = {
    Name = "honeypot-igw"
  }
}

# Define the Route Table
resource "aws_route_table" "honeypot_public_rt" {
  vpc_id = aws_vpc.honeypot_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "honeypot-public-route-table"
  }
}

# Associate Route Table with Subnet
resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.honeypot_public_subnet.id
  route_table_id = aws_route_table.honeypot_public_rt.id
}

# Define Security Group (Allow HTTP/HTTPS for potential web honeypot)
resource "aws_security_group" "web_access" {
  name        = "honeypot-web-access-sg"
  description = "Allow HTTP and HTTPS inbound traffic"
  vpc_id      = aws_vpc.honeypot_vpc.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "honeypot-web-access-sg"
  }
}

# Data source to get available Availability Zones
data "aws_availability_zones" "available" {}