# Shakuni

## Overview
# Shakuni

Shakuni is a security deception platform designed to deploy, manage, and monitor honeypots and decoy assets in cloud environments. It features a Flask-based backend with MongoDB integration and a modern React (Vite + TypeScript + Shadcn UI) frontend. The platform supports both high-interaction and low/medium-interaction honeypots, with infrastructure-as-code managed via Terraform.

## Prerequisites
- **Docker** (recommended for deployment)
- **MongoDB** (can be run as a container)
- **Usage** Upon first setup go ahead and register a user to be used, and login, then go to the settings section and add your tf state bucket, for any webhook usages you will need a public ip( eith using ngrok, or having a public ip interface for the app deployed publically)

## Running with Docker and MongoDB

### 1. Create a Docker network
This allows the Shakuni container and MongoDB container to communicate:

```bash
docker network create shakuni-net
```

### 2. Deploy MongoDB as a container

```bash
docker run -d \
  --name mongo \
  --network shakuni-net \
  -e MONGO_INITDB_DATABASE=shakuni \
  -p 27017:27017 \
  mongo
```

- This starts MongoDB on the `shakuni-net` network with the default database `shakuni`.

### 3. Build the Shakuni Docker image

```bash
docker build -t shakuni .
```

### 4. Run the Shakuni container

```bash
docker run -it --rm \
  --name shakuni \
  --network shakuni-net \
  -p 5000:5000 \
  -p 8080:8080 \
  -v ~/.aws:/root/.aws \
  -e MONGO_URI=mongodb://mongo:27017/shakuni \
  shakuni
```

- The `MONGO_URI` uses `mongo` as the hostname, which resolves to the MongoDB container on the same network.
- The backend will connect to MongoDB at `mongodb://mongo:27017/shakuni`.

### 5. Access the Application
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:5000

## Running with MongoDB on Host (macOS)
If you want to use a MongoDB instance running on your Mac instead of a container, set the `MONGO_URI` to:

```bash
-e MONGO_URI=mongodb://host.docker.internal:27017/shakuni
```

This allows the container to connect to the host's MongoDB instance.

## Environment Variables
- `MONGO_URI`: MongoDB connection string (default: `mongodb://localhost:27017/shakuni`)
- `JWT_SECRET_KEY`: Secret key for JWT tokens (change in production)
- **Cloud Credentials:**
  - Ensure you have valid credentials set up for the cloud provider(s) you plan to use:
    - **AWS:** Configure using environment variables, AWS CLI, or credentials file (`~/.aws/credentials`).
    - **GCP:** Set up a service account and export the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to your JSON key file.
    - **Azure:** Use the Azure CLI to authenticate or set the appropriate environment variables for service principal authentication.
- **MongoDB**
- **Terraform** (installed and in PATH)
- **Python 3.8+**
- **Node.js 18+**

## Exposing the Backend with ngrok
To make your backend accessible over the internet (for webhook callbacks, cloud integrations, etc.), you can use [ngrok](https://ngrok.com/):

1. Install ngrok (if not already installed):
   ```bash
   brew install ngrok   # macOS
   # or download from https://ngrok.com/download
   ```
2. Start your backend server:
   ```bash
   cd backend
   python app.py
   ```
3. In a new terminal, run ngrok to expose your backend (default Flask port is 5000):
   ```bash
   ngrok http 5000
   ```
4. ngrok will display a public URL (e.g., `https://abcd1234.ngrok.io`). Use this URL for webhooks or external integrations.

## Docker Usage

You can run the entire Shakuni stack (backend, frontend, and Terraform) using the provided Dockerfile. This is the recommended way to ensure all dependencies are available and the environment is consistent.

### Build the Docker Image

```bash
docker build -t shakuni .
```

### Running the Container

To run the container and ensure the backend and frontend are accessible, and to provide cloud credentials for AWS, GCP, or Azure, use the following command:

```bash
docker run -it --rm \
  -p 5000:5000 \
  -p 8080:8080 \
  -v ~/.aws:/root/.aws \
  -v ~/.config/gcloud:/root/.config/gcloud \
  -v ~/.azure:/root/.azure \
  --name shakuni \
  shakuni
```

- `-p 5000:5000` exposes the Flask backend on port 5000.
- `-p 8080:8080` exposes the frontend on port 8080.
- `-v ~/.aws:/root/.aws` mounts your AWS credentials into the container.
- `-v ~/.config/gcloud:/root/.config/gcloud` mounts your GCP credentials.
- `-v ~/.azure:/root/.azure` mounts your Azure credentials.

You can mount only the credential directories you need for your cloud provider(s).

The backend and frontend will be available at `http://localhost:5000` and `http://localhost:8080` respectively.

Upon first setup go ahead and register a user to be used, and login, then go to the settings section and add your tf state bucket, for any webhook usages you will need a public ip( eith using ngrok, or having a public ip interface for the app deployed publically)

## Custom Deceptions

The Shakuni platform includes a rich set of custom deception techniques, accessible via the frontend's Custom Deceptions page (`frontend/src/pages/CustomDeceptions.tsx`). These include:

- **Generic Webhook**: Generates a unique webhook URL for tracking link clicks or other events.
- **SSH Log Capture**: Provides a script to capture SSH login attempts and forward them to the backend for analysis.
- **Kubernetes Decoy**: Supplies a Kubernetes YAML manifest with enticing secrets and service accounts, designed to lure attackers and trigger alerts when applied.
- **Tracking PDF**: Generates a PDF document with embedded tracking, reporting when and where it is opened.
- **HTML Decoy Button**: Offers HTML content with a login button that triggers tracking events when clicked.
- **Decoy Password File**: Creates a file with a hidden tracker to detect unauthorized access.
- **Email Deception**: Provides an email template with embedded tracking links and pixels to monitor when it is opened or interacted with.

Each deception type is designed to be easily copied and deployed in various environments, with tracking integrated via the backend API.

## Terraform Honeypot Deployments

The backend includes comprehensive Terraform templates for deploying honeypots on AWS. These are located in `backend/terraform` and its subdirectories:

- **Web Honeypot (High Interaction)**: Deploys an EC2 instance running a fake login portal. Credentials entered are captured and forwarded to the backend API. The deployment is managed via `backend/terraform/templates/aws/web_honeypot`, with a customizable `deploy_honeypot.sh` script and supporting Terraform files. Log rotation and cron jobs are set up to forward Apache logs to the backend for continuous monitoring.
- **S3 Bucket Honeypot**: Provisions an S3 bucket with logging and tagging to attract attackers and monitor unauthorized access. Configuration is in `backend/terraform/honeypot`.
- **Cloud Native Honeypot (Low/Medium Interaction)**: Uses AWS Secrets Manager and other resources to create enticing targets for attackers, with all access attempts logged and reported.

Each template includes detailed README files and example `terraform.tfvars` for easy customization. Deployments require properly configured cloud credentials and Terraform installed in the environment.

## Project Structure
```
shakuni/
  backend/      # Flask API, log processing, Terraform orchestration, PDF generation
  frontend/     # React UI (Vite, TypeScript, Shadcn UI, ReactFlow for graph visualizations)
```

### Backend
- **Language:** Python (Flask)
- **Key Files:**
  - `app.py`: Main Flask app, user authentication, MongoDB integration, API endpoints
  - `log_routes.py`: Log ingestion and alert management
  - `terraform_routes.py`: Orchestrates Terraform deployments for honeypots
  - `pdf_generator.py`: Generates tracking PDFs
  - `requirements.txt`: Python dependencies
  - `terraform/`: Terraform templates for AWS honeypots (S3, EC2, IAM, Lambda, etc.)
- **Dependencies:** Flask, Flask-Cors, Flask-JWT-Extended, pymongo, bcrypt, python-dotenv, boto3, APScheduler
- **Run:**
  ```bash
  cd backend
  pip install -r requirements.txt
  python app.py
  ```

### Frontend
- **Language:** TypeScript (React, Vite)
- **Key Files:**
  - `src/pages/`: Main UI pages (DeployDeception, ViewAssets, CustomDeceptions, etc.)
  - `src/components/`: UI components
  - `index.html`: App entry point
  - `package.json`: Frontend dependencies
- **Dependencies:** React, @xyflow/react (ReactFlow), Shadcn UI, Radix UI, TanStack React Query, date-fns, etc.
- **Run:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

## Infrastructure-as-Code (Terraform)
- **Templates:** Located in `backend/terraform/templates/aws/`
- **High-Interaction Web Honeypot:**
  - Deploys a fake web server in an isolated AWS account
  - See `backend/terraform/README.md` for multi-account setup and usage
- **S3 Honeypot:**
  - Deploys a decoy S3 bucket for monitoring
  - See `backend/terraform/honeypot/README.md` for setup

## Usage
1. **Backend:**
   - Configure MongoDB and AWS credentials (see environment variables in `app.py`)
   - Start Flask API: `python app.py`
2. **Frontend:**
   - Start React UI: `npm run dev`
   - Access via [http://localhost:8080](http://localhost:8080)
3. **Deploy Honeypots:**
   - Use the web UI to deploy honeypots (Terraform runs via backend)
   - Configure AWS credentials and state bucket as described in the Terraform READMEs

## Features
- User registration/login (JWT-based)
- Deploy and manage AWS honeypots (S3, EC2, IAM, Lambda, etc.)
- Visualize alerts and asset relationships (ReactFlow graphs)
- Filter alerts by time, IP, user, and event type
- Generate tracking PDFs and decoy files
- Multi-account AWS deployment support

## Requirements
- Python 3.8+
- Node.js 18+
- MongoDB
- AWS account(s) for honeypot deployment
- Terraform (installed and in PATH)

## References
- See `backend/terraform/README.md` and `backend/terraform/honeypot/README.md` for detailed Terraform deployment instructions.

---
This README was generated based on the current project structure and available documentation. For more details, refer to the code and in-directory README files.

        
