# EC2 Instance for Web Honeypot

# Ubuntu 22.04 AMI lookup
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group for honeypot web server
resource "aws_security_group" "honeypot_sg" {
  name        = "honeypot-security-group"
  description = "Security group for honeypot web server"
  vpc_id      = aws_vpc.honeypot_vpc.id

  # Allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }

  # Allow HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }
  
  # Allow SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow SSH traffic"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "honeypot-sg"
  }
}

# IAM role for EC2 instance
resource "aws_iam_role" "honeypot_role" {
  name = "honeypot-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Name = "honeypot-role"
  }
}

# IAM instance profile
resource "aws_iam_instance_profile" "honeypot_profile" {
  name = "honeypot-instance-profile"
  role = aws_iam_role.honeypot_role.name
}

# EC2 Instance
resource "aws_instance" "honeypot" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro" # Free tier eligible
  subnet_id              = aws_subnet.honeypot_public_subnet.id
  vpc_security_group_ids = [aws_security_group.honeypot_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.honeypot_profile.name
  # Removed key_name as we're using user_data instead of SSH
  
  # User data script to deploy honeypot without SSH
  user_data = <<-EOF
#!/bin/bash

# Honeypot Web Server Deployment Script
# This script sets up a honeypot web server on an EC2 instance
# It creates a fake login page and captures credentials

# Exit on any error
set -e

# Configuration variables
API_ENDPOINT="${var.api_endpoint}"
API_KEY="${var.api_key}"

# Update system packages
echo "[+] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "[+] Installing required packages..."
apt-get install -y apache2 php php-curl jq

# Enable required Apache modules
a2enmod ssl
a2enmod headers
a2enmod rewrite

# Create directory for honeypot files
echo "[+] Creating directory for honeypot files..."
sudo mkdir -p /var/www/honeypot

# Create fake login page
echo "[+] Creating fake login page..."
sudo cat > /var/www/honeypot/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Portal Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .login-container {
            background-color: white;
            padding: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 350px;
        }
        .login-container h2 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #666;
        }
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            box-sizing: border-box;
        }
        .form-group input:focus {
            outline: none;
            border-color: #0056b3;
        }
        .btn {
            width: 100%;
            padding: 10px;
            background-color: #0056b3;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 16px;
        }
        .btn:hover {
            background-color: #004494;
        }
        .error-message {
            color: red;
            text-align: center;
            margin-top: 10px;
            display: none;
        }
        .company-logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .company-logo img {
            max-width: 150px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="company-logo">
            <h2>Company Portal</h2>
        </div>
        <form id="login-form" action="login.php" method="post">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn">Login</button>
            <div class="error-message" id="error-message">
                Invalid username or password. Please try again.
            </div>
        </form>
    </div>
</body>
</html>
EOL

# Create PHP handler for login form
echo "[+] Creating PHP handler for login form..."
sudo cat > /var/www/honeypot/login.php << 'EOL'
<?php
// Get the submitted credentials
$username = isset($_POST['username']) ? $_POST['username'] : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';

// Get additional information
$ip_address = $_SERVER['REMOTE_ADDR'];
$user_agent = $_SERVER['HTTP_USER_AGENT'];
$timestamp = date('Y-m-d H:i:s');

// Prepare data for logging
$log_data = [
    'source' => 'aws',
    'raw_message' => [
        'event_type' => 'honeypot_login_attempt',
        'username' => $username,
        'password' => $password,
        'ip_address' => $ip_address,
        'user_agent' => $user_agent,
        'timestamp' => $timestamp
    ]
];

// Ensure log directory exists
$log_dir = '/var/log/honeypot';
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0755, true);
}

// Log to file as backup
$log_file = '/var/log/honeypot/credentials.log';
$log_entry = json_encode($log_data) . "\n";
file_put_contents($log_file, $log_entry, FILE_APPEND);

// Send data to API endpoint
$api_endpoint = getenv('API_ENDPOINT');
$api_key = getenv('API_KEY');

$ch = curl_init($api_endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($log_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ' . $api_key
]);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

// Log API response for debugging
if ($error) {
    file_put_contents($log_dir . '/api_errors.log', "[{$timestamp}] Error: {$error}\n", FILE_APPEND);
} else {
    file_put_contents($log_dir . '/api_responses.log', "[{$timestamp}] Response: {$response}\n", FILE_APPEND);
}

// Redirect back to login page with error to make it look realistic
header('Location: index.html?error=1');
exit;
?>
EOL

# Create Apache virtual host configuration
echo "[+] Configuring Apache virtual host..."
sudo cat > /etc/apache2/sites-available/honeypot.conf << EOL
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/honeypot
    ErrorLog $APACHE_LOG_DIR/honeypot-error.log
    CustomLog $APACHE_LOG_DIR/honeypot-access.log combined

    <Directory /var/www/honeypot>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Set environment variables for the API endpoint and key
    SetEnv API_ENDPOINT "$API_ENDPOINT"
    SetEnv API_KEY "$API_KEY"
</VirtualHost>
EOL

# Create log directory for honeypot
echo "[+] Creating log directory for honeypot..."
sudo mkdir -p /var/log/honeypot
sudo chown www-data:www-data /var/log/honeypot

# Enable the site and restart Apache
sudo a2ensite honeypot.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2

# Set up log rotation for honeypot logs
echo "[+] Setting up log rotation for honeypot logs..."
sudo cat > /etc/logrotate.d/honeypot << EOL
/var/log/honeypot/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload apache2 > /dev/null 2>/dev/null || true
    endscript
}
EOL

# Set up a cron job to forward Apache logs to the API
echo "[+] Setting up log forwarding cron job..."
sudo cat > /usr/local/bin/forward_apache_logs.sh << 'EOL'
#!/bin/bash

API_ENDPOINT="$(grep -oP 'SetEnv API_ENDPOINT "\K[^"]+' /etc/apache2/sites-available/honeypot.conf)"
API_KEY="$(grep -oP 'SetEnv API_KEY "\K[^"]+' /etc/apache2/sites-available/honeypot.conf)"
LOG_FILE="/var/log/apache2/honeypot-access.log"
LOG_DIR="/var/log/honeypot"
LAST_POSITION_FILE="$LOG_DIR/last_position.txt"

# Ensure log directory exists
sudo mkdir -p "$LOG_DIR"
sudo chown www-data:www-data "$LOG_DIR"
sudo touch "$LAST_POSITION_FILE"
sudo chown www-data:www-data "$LAST_POSITION_FILE"

# Get the last position we processed
LAST_POSITION=$(cat "$LAST_POSITION_FILE" 2>/dev/null || echo 0)

# Get the current size of the log file
CURRENT_SIZE=$(stat -c%s "$LOG_FILE")

# If the file has grown, process the new lines
if [ "$CURRENT_SIZE" -gt "$LAST_POSITION" ]; then
    # Extract new log entries
    NEW_LOGS=$(tail -c +$((LAST_POSITION + 1)) "$LOG_FILE")

    # For each new log entry, send it to the API
    echo "$NEW_LOGS" | while IFS= read -r line; do
        if [ -n "$line" ]; then
            # Prepare the JSON payload
            JSON_PAYLOAD=$(jq -n --arg source "aws" --arg message "$line" \
                '{source: $source, raw_message: {event_type: "apache_log", log_entry: $message}}')

            # Send to API
            curl -s -X POST "$API_ENDPOINT" \
                -H "Content-Type: application/json" \
                -H "X-API-Key: $API_KEY" \
                -d "$JSON_PAYLOAD" > /dev/null
        fi
    done

    # Update the last position
    echo "$CURRENT_SIZE" > "$LAST_POSITION_FILE"
fi
EOL

sudo chmod +x /usr/local/bin/forward_apache_logs.sh

# Add cron job to run every 5 minutes
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/forward_apache_logs.sh") | sudo crontab -

# Correct the log directory if it exists in the wrong place
if [ -d "/var/log/honeypot" ]; then
  echo "[+] Moving any existing honeypot log files to /var/log..."
  sudo mv /var/log/honeypot/* /var/log/
  sudo rmdir /var/log/honeypot
fi

# Create the correct log directory for honeypot (again, to ensure it's there)
echo "[+] Ensuring the honeypot log directory exists..."
sudo mkdir -p /var/log/honeypot
sudo chown www-data:www-data /var/log/honeypot

echo "[+] Honeypot web server setup complete!"
echo "[+] Fake login page is available at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/"
echo "[+] Credentials will be logged to /var/log/honeypot/credentials.log"
echo "[+] API responses will be logged to /var/log/honeypot/api_responses.log"
echo "[+] Apache logs will be forwarded to the API endpoint every 5 minutes"
    SCRIPT
    
    # Make script executable and run it
    chmod +x /tmp/deploy_honeypot.sh
    /tmp/deploy_honeypot.sh
    
    # Signal successful completion
    echo "Honeypot setup completed successfully."
  EOF
  
  # Set user_data_replace_on_change to ensure script runs on updates
  user_data_replace_on_change = true

  tags = {
    Name = "honeypot-web-server"
  }

  # Ensure the instance has a public IP
  associate_public_ip_address = true

  # Wait for the instance to be created before running provisioners
  depends_on = [aws_internet_gateway.gw]
}

# Output the public IP of the honeypot
output "honeypot_public_ip" {
  value       = aws_instance.honeypot.public_ip
  description = "The public IP address of the honeypot web server"
}

# Output the public DNS of the honeypot
output "honeypot_public_dns" {
  value       = aws_instance.honeypot.public_dns
  description = "The public DNS of the honeypot web server"
}