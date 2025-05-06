from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
import logging
import secrets
import os
import tempfile

# Import the PDF generator
from pdf_generator import generate_pdf

# Initialize Blueprint
log_bp = Blueprint('log_bp', __name__)

@log_bp.route('/ingest', methods=['POST'])
def ingest_log():
    # Placeholder: Access MongoDB collection (replace with actual method)
    # Assuming cloud_alerts_collection is accessible via app context or direct import
    try:
        from app import cloud_alerts_collection, settings_collection
    except ImportError:
        logging.error("Could not import collections from app. Ensure MongoDB is initialized.")
        return jsonify({"error": "Server configuration error"}), 500

    # Get API key from request header
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        return jsonify({"error": "API key is required"}), 401
    
    # Find user by API key within the api_keys list
    user_settings = settings_collection.find_one({"api_keys.key": api_key})
    if not user_settings:
        return jsonify({"error": "Invalid API key"}), 401

    # Extract the user_id associated with the settings document
    user_id = user_settings.get("user_id")
    if not user_id:
        # This case should ideally not happen if the key is found, but good to check
        logging.error(f"API key {api_key[:4]}... found, but no associated user_id in document {user_settings.get('_id')}")
        return jsonify({"error": "Internal server error: User ID mapping issue"}), 500
    
    # Check if the request has JSON data
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    log_data = request.get_json()

    if not log_data:
        return jsonify({"error": "No log data provided"}), 400

    # Prepare the document to be inserted
    log_entry = {
        "user_id": user_id,
        "received_at": datetime.now(),
        "source": "api_ingest", # Indicate the source of the log
        "raw_message": log_data # Store the entire received JSON payload
        # You could add more specific fields here if you parse log_data further
        # e.g., "event_time": log_data.get('timestamp'), "details": log_data.get('details')
    }

    try:
        # Insert the log entry into the collection
        result = cloud_alerts_collection.insert_one(log_entry)
        logging.info(f"Successfully ingested log for user {user_id}. Inserted ID: {result.inserted_id}")
        return jsonify({"message": "Log ingested successfully", "log_id": str(result.inserted_id)}), 201
    except Exception as e:
        logging.error(f"Error inserting log for user {user_id}: {e}")
        return jsonify({"error": "Failed to ingest log"}), 500

@log_bp.route('/ingest', methods=['GET'])
def ingest_log_get():
    # Access MongoDB collections
    try:
        from app import cloud_alerts_collection, settings_collection, generic_alerts_collection
    except ImportError:
        logging.error("Could not import collections from app. Ensure MongoDB is initialized.")
        return jsonify({"error": "Server configuration error"}), 500

    # Get API key from request header or query parameter
    api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
    if not api_key:
        return jsonify({"error": "API key is required"}), 401
    
    # Find user by API key
    user_settings = settings_collection.find_one({"api_keys.key": api_key})
    if not user_settings:
        return jsonify({"error": "Invalid API key"}), 401

    # Extract the user_id
    user_id = user_settings.get("user_id")
    if not user_id:
        logging.error(f"API key {api_key[:4]}... found, but no associated user_id in document {user_settings.get('_id')}")
        return jsonify({"error": "Internal server error: User ID mapping issue"}), 500
    
    # Get log data from query parameters
    # Extract all query parameters except api_key
    log_data = {}
    for key, value in request.args.items():
        if key != 'api_key':
            log_data[key] = value
    
    if not log_data:
        return jsonify({"error": "No log data provided in query parameters"}), 400

    # Check if type parameter is provided to determine which collection to use
    alert_type = request.args.get('type')
    
    # Capture comprehensive client information
    client_info = {
        # Basic connection info
        "ip_address": request.remote_addr,
        "x_forwarded_for": request.headers.get('X-Forwarded-For', 'Unknown'),  # For clients behind proxies
        "host": request.host,
        "method": request.method,
        "path": request.path,
        "url": request.url,
        "timestamp": datetime.now().isoformat(),
        
        # User agent details
        "user_agent": request.headers.get('User-Agent', 'Unknown'),
        "browser": request.user_agent.browser if hasattr(request, 'user_agent') else 'Unknown',
        "platform": request.user_agent.platform if hasattr(request, 'user_agent') else 'Unknown',
        "version": request.user_agent.version if hasattr(request, 'user_agent') else 'Unknown',
        "language": request.user_agent.language if hasattr(request, 'user_agent') else 'Unknown',
        
        # HTTP headers
        "referer": request.headers.get('Referer', 'Unknown'),
        "accept": request.headers.get('Accept', 'Unknown'),
        "accept_encoding": request.headers.get('Accept-Encoding', 'Unknown'),
        "accept_language": request.headers.get('Accept-Language', 'Unknown'),
        "cache_control": request.headers.get('Cache-Control', 'Unknown'),
        "connection": request.headers.get('Connection', 'Unknown'),
        "dnt": request.headers.get('DNT', 'Unknown'),  # Do Not Track
        "origin": request.headers.get('Origin', 'Unknown'),
        "pragma": request.headers.get('Pragma', 'Unknown'),
        "sec_fetch_dest": request.headers.get('Sec-Fetch-Dest', 'Unknown'),
        "sec_fetch_mode": request.headers.get('Sec-Fetch-Mode', 'Unknown'),
        "sec_fetch_site": request.headers.get('Sec-Fetch-Site', 'Unknown'),
        "sec_fetch_user": request.headers.get('Sec-Fetch-User', 'Unknown'),
        "upgrade_insecure_requests": request.headers.get('Upgrade-Insecure-Requests', 'Unknown'),
        
        # Cookies (if any)
        "cookies": {key: value for key, value in request.cookies.items()} if request.cookies else {},
        
        # All headers (for any we missed)
        "all_headers": {key: value for key, value in request.headers.items()}
    }
    
    # Prepare the document to be inserted
    log_entry = {
        "user_id": user_id,
        "received_at": datetime.now(),
        "type": alert_type or "unknown",  # Store the type of generic log ingestion
        "source": "api_ingest_get",  # Indicate this came from GET request
        "client_info": client_info,  # Add client information
        "raw_message": log_data
    }

    try:
        # Determine which collection to use based on presence of type parameter
        if alert_type:
            # Insert into generic_alerts collection
            result = generic_alerts_collection.insert_one(log_entry)
            collection_name = "generic_alerts"
        else:
            # Insert into regular cloud_alerts collection (backward compatibility)
            result = cloud_alerts_collection.insert_one(log_entry)
            collection_name = "cloud_alerts"
            
        logging.info(f"Successfully ingested log via GET for user {user_id} in {collection_name}. Inserted ID: {result.inserted_id}")
        return jsonify({"message": "Log ingested successfully", "log_id": str(result.inserted_id)}), 201
    except Exception as e:
        logging.error(f"Error inserting log for user {user_id}: {e}")
        return jsonify({"error": "Failed to ingest log"}), 500

@log_bp.route('/generate-pdf', methods=['GET'])
def generate_tracking_pdf():
    # Access MongoDB collections
    try:
        from app import settings_collection
    except ImportError:
        logging.error("Could not import collections from app. Ensure MongoDB is initialized.")
        return jsonify({"error": "Server configuration error"}), 500

    # Get API key from query parameter
    api_key = request.args.get('api_key')
    if not api_key:
        return jsonify({"error": "API key is required"}), 401
    
    # Find user by API key
    user_settings = settings_collection.find_one({"api_keys.key": api_key})
    if not user_settings:
        return jsonify({"error": "Invalid API key"}), 401

    # Get filename from query parameters or use default
    filename = request.args.get('filename', 'tracking-document.pdf')
    
    # Get description from query parameters or use default
    description = request.args.get('description', '')
    
    # Get server URL from query parameter provided by frontend, fallback to request root if not provided
    server_url_param = request.args.get('server_url')
    if server_url_param:
        server_url = server_url_param.rstrip('/')
    else:
        # Fallback logic (might be less reliable depending on deployment)
        server_url = request.url_root.rstrip('/')
        if server_url.endswith('/api/logs'):
            server_url = server_url[:-9]  # Remove '/api/logs' if present
    
    # Create a temporary file to store the PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_filename = temp_file.name
    
    # Generate the PDF with tracking capabilities
    title = "Financial Statement Q3 2024"
    # Make the content look like a financial record, DO NOT include the user's description here.
    content = (
        "CONFIDENTIAL - Financial Summary\n\n"
        "Account Balance: $1,234,567.89\n"
        "Recent Transactions:\n"
        "  - Transfer IN: +$50,000.00 (Ref: INV-9876)\n"
        "  - Withdrawal: -$15,250.50 (Ref: PAY-1234)\n"
        "  - Interest Earned: +$1,200.00\n\n"
        "Pending Actions: Review Q3 performance report.\n\n"
        "Note: This document contains embedded tracking features for security purposes."
    )
    
    logging.info(f"[generate_pdf route] Received server_url_param: {server_url_param}")
    logging.info(f"[generate_pdf route] Using server_url: {server_url} for PDF generation")
    
    try:
        # Generate the PDF using our pdf_generator module
        # The 'content' variable above is for the visible PDF body.
        # The 'description' parameter is passed separately for the tracking URL.
        generate_pdf(
            filename=temp_filename,
            title=title,
            content=content,  # Use the fake financial content for the visible body
            api_key=api_key,
            server_url=server_url,
            description=description  # Pass the original description for the tracking URL
        )
        
        # Send the file to the client
        return send_file(
            temp_filename,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except Exception as e:
        logging.error(f"Error generating PDF: {e}")
        return jsonify({"error": "Failed to generate PDF"}), 500
    finally:
        # Clean up the temporary file after sending
        # Note: In some cases this might execute before the file is sent
        # so we might need a more sophisticated cleanup mechanism
        try:
            os.unlink(temp_filename)
        except:
            pass

# Helper function to generate a secure API key
def generate_api_key():
    return secrets.token_hex(32)  # 64 character hex string