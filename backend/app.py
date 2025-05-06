import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS # Remove cross_origin import again
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient
import bcrypt
import os
from datetime import timedelta, datetime
import re
import subprocess
import json
import threading
import atexit
import logging
import boto3
from apscheduler.schedulers.background import BackgroundScheduler
import json

# Import Blueprints
from terraform_routes import terraform_bp, parse_terraform_variables # Import parse_terraform_variables here
from log_routes import log_bp

# Basic logging configuration
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Import honeypot monitoring functions
# from honeypot_monitor import start_monitoring, stop_monitoring, get_alerts, save_setting # Import save_setting

# Initialize Flask app
app = Flask(__name__)

# Configure CORS to allow requests from frontend
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}}, supports_credentials=True, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allow_headers='*') # Allow OPTIONS and all headers

# Configure JWT
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-key")  # Change in production
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
jwt = JWTManager(app)

# Connect to MongoDB
try:
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/shakuni")
    client = MongoClient(mongo_uri)
    db = client.shakuni
    users_collection = db.users
    settings_collection = db.settings
    high_interaction_honeypot_state_file_collection = db.high_interaction_honeypot_state_file # New collection for web honeypot state
    deployments_collection = db.deployments # New collection for deployment history
    sqsurl_collection = db.sqsurl # New collection for SQS URLs
    cloud_alerts_collection = db.cloud_alerts # New collection for Cloud Alerts
    generic_alerts_collection = db.generic_alerts # New collection for Generic Alerts from GET requests
    # Create unique index on email field
    users_collection.create_index("email", unique=True)
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# --- SQS Polling Function --- 
# Removed poll_sqs_and_save function

# --- Background Scheduler Setup ---
# Removed scheduler setup and atexit registration

# --- Honeypot Monitoring Setup ---
# Removed honeypot setup code

# Helper functions
def is_valid_email(email):
    email_regex = r'^[\w\.-]+@([\w-]+\.)+[A-Za-z]{2,}$'
    return re.match(email_regex, email) is not None

def is_valid_password(password):
    # Password should be at least 8 characters with at least one number and one letter
    return len(password) >= 8 and any(c.isdigit() for c in password) and any(c.isalpha() for c in password)

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({"error": "Missing required fields"}), 400
    
    email = data['email']
    password = data['password']
    username = data['username']
    
    # Validate email format
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Validate password strength
    if not is_valid_password(password):
        return jsonify({"error": "Password must be at least 8 characters with at least one letter and one number"}), 400
    
    # Check if user already exists
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409
    
    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user document
    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "created_at": datetime.now()
    }
    
    # Insert user into database
    try:
        users_collection.insert_one(user)
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400
    
    email = data['email']
    password = data['password']
    
    # Find user in database
    user = users_collection.find_one({"email": email})
    
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Create access token
    access_token = create_access_token(identity=str(user['_id']))
    
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email']
        }
    }), 200

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user_profile():
    # Get user ID from JWT token
    current_user_id = get_jwt_identity()
    
    # Find user in database
    from bson.objectid import ObjectId
    user = users_collection.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Return user data (excluding password)
    return jsonify({
        "id": str(user['_id']),
        "username": user['username'],
        "email": user['email']
    }), 200



@app.route('/api/settings', methods=['POST'])
@jwt_required()
def update_settings():
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Prepare update data for general settings
    general_update_data = {}
    if 'terraform_provider' in data:
        # Validate provider before adding
        if data['terraform_provider'] in ['aws', 'gcp', 'azure']:
             general_update_data['terraform_provider'] = data['terraform_provider']
        else:
            # Optionally return an error if the provider is invalid for general settings
            # return jsonify({"error": "Invalid terraform_provider for general settings"}), 400
            pass # Or just ignore the invalid provider for this update
    if 'terraform_s3_bucket' in data:
        general_update_data['terraform_s3_bucket'] = data['terraform_s3_bucket']
    if 'terraform_gcs_bucket' in data:
        general_update_data['terraform_gcs_bucket'] = data['terraform_gcs_bucket']
    if 'terraform_azure_container' in data:
        general_update_data['terraform_azure_container'] = data['terraform_azure_container']

    # Update or insert general settings
    if general_update_data:
        settings_collection.update_one(
            {"user_id": user_id},
            {"$set": general_update_data},
            upsert=True
        )
    
    # Prepare update data for web honeypot settings
    web_honeypot_update_data = {}
    if 'web_honeypot_terraform_provider' in data:
         # Validate provider before adding
        if data['web_honeypot_terraform_provider'] in ['aws', 'gcp', 'azure']:
            web_honeypot_update_data['web_honeypot_terraform_provider'] = data['web_honeypot_terraform_provider']
        else:
            # Optionally return an error if the provider is invalid for web honeypot settings
            # return jsonify({"error": "Invalid web_honeypot_terraform_provider"}), 400
            pass # Or just ignore the invalid provider for this update
    if 'web_honeypot_terraform_s3_bucket' in data:
        web_honeypot_update_data['web_honeypot_terraform_s3_bucket'] = data['web_honeypot_terraform_s3_bucket']
    if 'web_honeypot_terraform_gcs_bucket' in data:
        web_honeypot_update_data['web_honeypot_terraform_gcs_bucket'] = data['web_honeypot_terraform_gcs_bucket']
    if 'web_honeypot_terraform_azure_container' in data:
        web_honeypot_update_data['web_honeypot_terraform_azure_container'] = data['web_honeypot_terraform_azure_container']

    # Update or insert web honeypot settings
    if web_honeypot_update_data:
        high_interaction_honeypot_state_file_collection.update_one(
            {"user_id": user_id},
            {"$set": web_honeypot_update_data},
            upsert=True
        )

    # Check if at least one update occurred
    if not general_update_data and not web_honeypot_update_data:
         return jsonify({"message": "No valid settings provided for update"}), 400 # Or 200 with a different message

    return jsonify({"message": "Settings updated successfully"}), 200

# Helper function for Terraform operations
# Removed run_terraform_command function

# Removed Terraform deploy/destroy/variables routes

# Endpoint to get deployment history
@app.route('/api/deployments/history', methods=['GET'])
@jwt_required()
def get_deployment_history():
    current_user_id = get_jwt_identity()
    try:
        # Fetch history, sort by timestamp descending, limit results (e.g., 20)
        history_cursor = deployments_collection.find({
            "user_id": current_user_id
        }).sort("timestamp", -1).limit(20)

        history = []
        for item in history_cursor:
            # Convert ObjectId and datetime for JSON serialization
            item['_id'] = str(item['_id'])
            item['timestamp'] = item['timestamp'].isoformat()
            history.append(item)

        return jsonify(history), 200
    except Exception as e:
        print(f"Error fetching deployment history: {e}")
        return jsonify({"error": "Failed to fetch deployment history."}), 500

# Helper function to parse variables.tf
# Moved parse_terraform_variables to terraform_routes.py, imported above

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

# --- Honeypot Alert Endpoint ---
# Removed honeypot alert endpoint (assuming it was related to the removed monitor)

# --- Cloud Alerts API Endpoint --- 
@app.route('/api/alerts', methods=['GET'])
@jwt_required()
def get_cloud_alerts():
    current_user_id = get_jwt_identity()
    logging.debug(f"Fetching alerts for user_id: {current_user_id}")
    try:
        # Fetch alerts sorted by received time, newest first
        alerts = list(cloud_alerts_collection.find({"user_id": current_user_id}).sort("received_at", -1))

        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            alert['_id'] = str(alert['_id'])
            # Convert datetime objects to ISO format string
            if isinstance(alert.get('received_at'), datetime):
                alert['received_at'] = alert['received_at'].isoformat()
            if isinstance(alert.get('event_time'), datetime):
                 alert['event_time'] = alert['event_time'].isoformat()
            # Ensure raw_message is serializable (it might already be dict/str)
            if isinstance(alert.get('raw_message'), datetime):
                 alert['raw_message'] = alert['raw_message'].isoformat()

        logging.debug(f"Found {len(alerts)} alerts for user {current_user_id}")
        return jsonify(alerts), 200
    except Exception as e:
        logging.error(f"Error fetching alerts for user {current_user_id}: {e}")
        return jsonify({"error": "Failed to fetch alerts"}), 500

# Register Blueprints
app.register_blueprint(terraform_bp, url_prefix='/api/terraform')
app.register_blueprint(log_bp, url_prefix='/api/logs')

# --- Generic Alerts API Endpoint --- 
@app.route('/api/generic-alerts', methods=['GET'])
@jwt_required()
def get_generic_alerts():
    current_user_id = get_jwt_identity()
    logging.debug(f"Fetching generic alerts for user_id: {current_user_id}")
    try:
        # Fetch alerts sorted by received time, newest first
        alerts = list(generic_alerts_collection.find({"user_id": current_user_id}).sort("received_at", -1))

        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            alert['_id'] = str(alert['_id'])
            # Convert datetime objects to ISO format string
            if isinstance(alert.get('received_at'), datetime):
                alert['received_at'] = alert['received_at'].isoformat()
            if isinstance(alert.get('event_time'), datetime):
                 alert['event_time'] = alert['event_time'].isoformat()
            # Ensure raw_message is serializable (it might already be dict/str)
            if isinstance(alert.get('raw_message'), datetime):
                 alert['raw_message'] = alert['raw_message'].isoformat()

        logging.debug(f"Found {len(alerts)} generic alerts for user {current_user_id}")
        return jsonify(alerts), 200
    except Exception as e:
        logging.error(f"Error fetching generic alerts for user {current_user_id}: {e}")
        return jsonify({"error": "Failed to fetch generic alerts"}), 500

# API Key generation function
def generate_api_key():
    return secrets.token_hex(32)  # 64 character hex string

# Overwrite the previous /api/settings GET endpoint definition
# (The previous block already included the updated version)

# API Key endpoints
@app.route('/api/settings/api-keys', methods=['GET'])
@jwt_required()
def get_user_api_keys():
    current_user_id = get_jwt_identity()
    user_settings = settings_collection.find_one({"user_id": current_user_id}, {"api_keys": 1, "_id": 0})
    api_keys = user_settings.get('api_keys', []) if user_settings else []
    # Return only names and potentially a prefix/suffix of the key for security
    keys_summary = [{'name': key['name'], 'key_preview': key['key'][:4] + '...' + key['key'][-4:]} for key in api_keys]
    return jsonify(keys_summary), 200

@app.route('/api/settings/api-key', methods=['POST'])
@jwt_required()
def generate_user_api_key():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    key_name = data.get('name')

    if not key_name:
        return jsonify({"error": "API key name is required"}), 400

    # Check if a key with the same name already exists for this user
    existing_key = settings_collection.find_one({"user_id": current_user_id, "api_keys.name": key_name})
    if existing_key:
        return jsonify({"error": f"An API key with the name '{key_name}' already exists"}), 409

    # Generate a new API key
    api_key_value = generate_api_key()
    new_key_entry = {"name": key_name, "key": api_key_value, "created_at": datetime.now()}

    # Add the new key to the user's api_keys list
    result = settings_collection.update_one(
        {"user_id": current_user_id},
        {"$push": {"api_keys": new_key_entry}},
        upsert=True  # Creates the document if user_id doesn't exist
    )

    if result.acknowledged:
        # Return the full key upon creation for the user to copy
        return jsonify({"name": key_name, "api_key": api_key_value}), 201
    else:
        return jsonify({"error": "Failed to save API key"}), 500

@app.route('/api/settings/api-key/<string:key_name>', methods=['DELETE'])
@jwt_required()
def delete_user_api_key(key_name):
    current_user_id = get_jwt_identity()

    if not key_name:
        return jsonify({"error": "API key name is required"}), 400

    # Remove the API key entry matching the name from the user's api_keys list
    result = settings_collection.update_one(
        {"user_id": current_user_id},
        {"$pull": {"api_keys": {"name": key_name}}}
    )

    if result.modified_count > 0:
        return jsonify({"message": f"API key '{key_name}' deleted successfully"}), 200
    elif result.matched_count > 0:
         return jsonify({"error": f"API key '{key_name}' not found or already deleted"}), 404
    else:
        # This case might mean the user document itself doesn't exist, or just no matching key
        return jsonify({"error": f"API key '{key_name}' not found"}), 404

# Need to update the GET /api/settings endpoint as well
@app.route('/api/settings', methods=['GET'])
@jwt_required()
def get_settings():
    user_id = get_jwt_identity()
    
    # Fetch general settings
    user_settings = settings_collection.find_one({"user_id": user_id})
    # Fetch web honeypot settings
    web_honeypot_settings = high_interaction_honeypot_state_file_collection.find_one({"user_id": user_id})

    # Prepare response data, combining both settings
    settings_data = {
        # General settings with defaults
        "terraform_provider": user_settings.get("terraform_provider", "aws") if user_settings else "aws",
        "terraform_s3_bucket": user_settings.get("terraform_s3_bucket", "") if user_settings else "",
        "terraform_gcs_bucket": user_settings.get("terraform_gcs_bucket", "") if user_settings else "",
        "terraform_azure_container": user_settings.get("terraform_azure_container", "") if user_settings else "",
        # Web honeypot settings with defaults
        "web_honeypot_terraform_provider": web_honeypot_settings.get("web_honeypot_terraform_provider", "aws") if web_honeypot_settings else "aws",
        "web_honeypot_terraform_s3_bucket": web_honeypot_settings.get("web_honeypot_terraform_s3_bucket", "") if web_honeypot_settings else "",
        "web_honeypot_terraform_gcs_bucket": web_honeypot_settings.get("web_honeypot_terraform_gcs_bucket", "") if web_honeypot_settings else "",
        "web_honeypot_terraform_azure_container": web_honeypot_settings.get("web_honeypot_terraform_azure_container", "") if web_honeypot_settings else "",
        # Include API keys summary (names and previews)
        "api_keys": [{'name': key['name'], 'key_preview': key['key'][:4] + '...' + key['key'][-4:]} for key in user_settings.get('api_keys', [])] if user_settings else []
    }
    return jsonify(settings_data), 200

if __name__ == '__main__':
    # Removed honeypot start monitoring call
    app.run(debug=True, host='0.0.0.0', port=5000)