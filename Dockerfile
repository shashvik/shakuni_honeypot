# Use an official Python base image with Node.js and Terraform installed
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y curl gnupg unzip && \
    # Install Node.js (LTS)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    # Install Terraform
    curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com bullseye main" > /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && \
    apt-get install -y terraform && \
    # Clean up
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip && pip install -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend package files and install
COPY frontend/package.json frontend/package-lock.json ./frontend/
# Copy frontend source before installing dependencies and building
COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

# Expose Flask and frontend ports
EXPOSE 5000 8080

# Default command: start backend (Flask) and serve frontend (using serve)
CMD bash -c "cd backend && python3 app.py & cd /app/frontend && npx serve -s dist -l 8080"