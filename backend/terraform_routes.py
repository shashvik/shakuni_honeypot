from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from pymongo import MongoClient
import os
import subprocess
import json
import re
from datetime import datetime
import logging

# Assuming MongoDB connection is managed in app.py and collections are accessible
# If not, connection logic needs to be added or passed here.
# For simplicity, let's assume access via app context or passed instances.
# This might require adjustments based on the actual app structure.
# Placeholder for accessing collections - replace with actual mechanism
# Example: from app import db

# Placeholder: Get collections - replace with actual access method
# Example: settings_collection = db.settings
# Example: deployments_collection = db.deployments
# Example: sqsurl_collection = db.sqsurl

# Initialize Blueprint
terraform_bp = Blueprint('terraform_bp', __name__)

# --- Helper function to parse variables.tf --- 
def parse_terraform_variables(file_path):
    logging.debug(f"Attempting to parse Terraform variables from: {file_path}")
    variables = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        logging.debug(f"Successfully read file: {file_path}")

        # Regex to find variable blocks
        variable_blocks = re.findall(r'variable "(.*?)" {([\s\S]*?)}', content)
        logging.debug(f"Found {len(variable_blocks)} potential variable blocks using regex.")

        for name, block_content in variable_blocks:
            var_details = {'name': name}
            # Extract description
            description_match = re.search(r'description\s*=\s*"(.*?)"', block_content)
            if description_match:
                var_details['description'] = description_match.group(1)
            # Extract type
            type_match = re.search(r'type\s*=\s*(.*?)(?:\n|\s*$)', block_content)
            if type_match:
                var_type = type_match.group(1).strip()
                var_type = re.sub(r'\s*#.*', '', var_type)
                var_details['type'] = var_type
            # Extract default value
            default_match = re.search(r'default\s*=\s*([\s\S]*?)\s*(?:\}|#|$)', block_content)
            if default_match:
                default_val_raw = default_match.group(1).strip()
                try:
                    if default_val_raw.startswith('"') and default_val_raw.endswith('"'):
                         var_details['default'] = default_val_raw[1:-1]
                    elif default_val_raw.lower() == 'true':
                         var_details['default'] = True
                    elif default_val_raw.lower() == 'false':
                         var_details['default'] = False
                    elif '.' in default_val_raw:
                         var_details['default'] = float(default_val_raw)
                    else:
                         var_details['default'] = int(default_val_raw)
                except ValueError:
                     var_details['default'] = default_val_raw
            else:
                var_details['default'] = None

            variables.append(var_details)

        logging.debug(f"Finished parsing {file_path}. Found {len(variables)} variables: {variables}")
        return variables

    except FileNotFoundError:
        logging.warning(f"Variables file not found at {file_path}")
        return []
    except Exception as e:
        logging.error(f"Error parsing {file_path}: {e}", exc_info=True)
        return []

# --- Helper function for Terraform operations --- 
def run_terraform_command(template_id, provider, state_config, command_type="apply", variables=None):
    if variables is None:
        variables = {}
    base_terraform_dir = os.path.join(os.path.dirname(__file__), 'terraform', 'templates')
    terraform_dir = os.path.join(base_terraform_dir, provider, template_id)

    if not os.path.isdir(terraform_dir):
        return {"status": "failure", "output": f"Invalid template ID: {template_id}. Directory not found."}

    tf_state_key = f"{template_id}/terraform.tfstate"
    backend_config_args = [f"-backend-config=key={tf_state_key}"]

    if provider == 'aws':
        bucket = state_config.get('bucket')
        region = state_config.get('region', 'us-east-1')
        if not bucket:
            return {"status": "failure", "output": "Missing S3 bucket name in state configuration for AWS backend."}
        logging.debug(f"Using AWS S3 bucket for backend: {bucket}")
        backend_config_args.append(f"-backend-config=bucket={bucket}")
        backend_config_args.append(f"-backend-config=region={region}")
    elif provider == 'azure':
        storage_account = state_config.get('storage_account_name')
        container = state_config.get('container_name')
        resource_group = state_config.get('resource_group_name')
        if not all([storage_account, container, resource_group]):
             return {"status": "failure", "output": "Missing Azure configuration (storage account, container, resource group) for backend."}
        backend_config_args.append(f"-backend-config=storage_account_name={storage_account}")
        backend_config_args.append(f"-backend-config=container_name={container}")
        backend_config_args.append(f"-backend-config=resource_group_name={resource_group}")
    elif provider == 'gcp':
        bucket = state_config.get('bucket')
        prefix = state_config.get('prefix', template_id)
        if not bucket:
            return {"status": "failure", "output": "Missing GCS bucket name in state configuration for GCP backend."}
        backend_config_args.append(f"-backend-config=bucket={bucket}")
        backend_config_args.append(f"-backend-config=prefix={prefix}")
    else:
        return {"status": "failure", "output": f"Unsupported provider: {provider}"}

    init_command_list = [
        'terraform',
        f'-chdir={terraform_dir}',
        'init',
        '-reconfigure'
    ]
    init_command_list.extend(backend_config_args)

    logging.info(f"Running command: {' '.join(init_command_list)}")
    init_process = subprocess.Popen(init_command_list, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(base_terraform_dir), text=True)
    init_stdout, init_stderr = init_process.communicate()
    init_output = init_stdout + init_stderr

    if init_process.returncode != 0:
        return {"status": "failure", "output": f"Failed to initialize Terraform for {template_id} with {provider} backend:\n{init_output}"}

    aws_region_var = f'aws_region={state_config.get("region", "us-east-1")}' if provider == 'aws' else None

    action_command_list_base = [
        'terraform',
        f'-chdir={terraform_dir}'
    ]

    if command_type == "apply":
        action_command_list = action_command_list_base + ['apply', '-auto-approve']
        if aws_region_var:
            action_command_list.append(f'-var={aws_region_var}')
    elif command_type == "destroy":
        action_command_list = action_command_list_base + ['destroy', '-auto-approve']
        if aws_region_var:
            action_command_list.append(f'-var={aws_region_var}')
    else:
        return {"status": "failure", "output": "Invalid command type specified."}

    for key, value in variables.items():
        if isinstance(value, bool):
            tf_value = str(value).lower()
        else:
            tf_value = str(value)
        action_command_list.append(f'-var={key}={tf_value}')

    logging.info(f"Running command: {' '.join(action_command_list)}")
    action_process = subprocess.Popen(action_command_list, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(base_terraform_dir), text=True)
    action_stdout, action_stderr = action_process.communicate()
    action_output = action_stdout + action_stderr

    if action_process.returncode != 0:
        return {"status": "failure", "output": f"Terraform {command_type} failed for {template_id}:\n{action_output}"}

    tf_outputs = {}
    if command_type == "apply":
        try:
            output_command_list = action_command_list_base + ['output', '-json']
            output_process = subprocess.run(output_command_list, capture_output=True, text=True, check=True, cwd=os.path.dirname(base_terraform_dir))
            tf_outputs = json.loads(output_process.stdout)
        except subprocess.CalledProcessError as e:
            logging.warning(f"Failed to get Terraform outputs for {template_id}: {e.stderr}")
        except json.JSONDecodeError as e:
            logging.warning(f"Failed to parse Terraform outputs JSON for {template_id}: {e}")

    return {"status": "success", "output": action_output, "terraform_outputs": tf_outputs}

# --- Terraform Routes --- 

@terraform_bp.route('/deploy', methods=['POST'])
@jwt_required()
def deploy_terraform():
    # Placeholder: Access MongoDB collections (replace with actual method)
    from app import settings_collection, deployments_collection, sqsurl_collection

    current_user_id = get_jwt_identity()
    data = request.get_json()
    template_id = data.get('template_id')
    provider = data.get('provider')

    if not provider or not template_id:
        return jsonify({"error": "Missing 'provider' or 'template_id' in request body."}), 400

    settings = settings_collection.find_one({"user_id": current_user_id})
    if not settings:
         return jsonify({"error": "User settings not found."}), 404
    logging.debug(f"Fetched settings for user {current_user_id}: {settings}")

    state_config = {'provider': provider}
    if provider == 'aws':
        state_config['bucket'] = settings.get("terraform_s3_bucket")
        state_config['region'] = settings.get("aws_region", "us-east-1") # Use setting or default
        if not state_config['bucket']:
             return jsonify({"error": "AWS S3 bucket for Terraform state not configured in settings."}), 400
    elif provider == 'azure':
        state_config['storage_account_name'] = settings.get("terraform_azure_storage_account")
        state_config['container_name'] = settings.get("terraform_azure_container")
        state_config['resource_group_name'] = settings.get("terraform_azure_resource_group")
        if not all([state_config.get('storage_account_name'), state_config.get('container_name'), state_config.get('resource_group_name')]):
            return jsonify({"error": "Azure Terraform state configuration incomplete in settings."}), 400
    elif provider == 'gcp':
        state_config['bucket'] = settings.get("terraform_gcs_bucket")
        if not state_config['bucket']:
             return jsonify({"error": "GCP GCS bucket for Terraform state not configured in settings."}), 400
    else:
        return jsonify({"error": f"Unsupported provider '{provider}' specified."}), 400

    tf_variables = data.get('variables', {})
    deploy_options = data.get('deploy_options', {})

    # Example: Merge deploy options for a specific template
    if template_id == 'aws_cloud_native_honeypot' and provider == 'aws':
        tf_variables['deploy_s3_buckets'] = deploy_options.get('deploy_s3_buckets', True)
        # ... add other options as needed

    result = run_terraform_command(template_id, provider, state_config, command_type="apply", variables=tf_variables)

    # AWS-specific: Save SQS URL if deployment successful
    if result["status"] == "success" and template_id == "aws_cloud_native_honeypot" and provider == 'aws':
        tf_outputs = result.get("terraform_outputs", {})
        sqs_queue_url = tf_outputs.get("honeypot_sqs_queue_url", {}).get("value")
        aws_region = state_config.get('region', 'us-east-1')

        if sqs_queue_url:
            logging.info(f"Saving SQS Queue URL: {sqs_queue_url} and Region: {aws_region} for user {current_user_id}")
            try:
                sqsurl_collection.update_one(
                    {"user_id": current_user_id},
                    {"$set": {"sqs_queue_url": sqs_queue_url, "aws_region": aws_region, "updated_at": datetime.now()}},
                    upsert=True
                )
                logging.info(f"Successfully saved SQS URL for user {current_user_id}")
            except Exception as e:
                logging.error(f"Error saving SQS URL to sqsurl collection: {e}")
        else:
            logging.warning("AWS Cloud Native Honeypot deployed but SQS queue URL not found in Terraform outputs.")

    status_code = 200 if result["status"] == "success" else 500
    try:
        deployments_collection.insert_one({
            "user_id": current_user_id,
            "template_id": template_id,
            "provider": provider,
            "action": "deploy",
            "status": result["status"],
            "timestamp": datetime.now(),
            "output": result.get("output", "")
        })
    except Exception as e:
        logging.error(f"Error logging deployment history: {e}")

    return jsonify(result), status_code

@terraform_bp.route('/destroy', methods=['POST', 'OPTIONS'])
@jwt_required()
def destroy_terraform():
    # Placeholder: Access MongoDB collections (replace with actual method)
    from app import settings_collection, deployments_collection, sqsurl_collection # Assuming stop_monitoring is also in app

    if request.method == 'OPTIONS':
        return jsonify({}), 200

    current_user_id = get_jwt_identity()
    data = request.get_json()
    template_id = data.get('template_id')
    provider = data.get('provider')

    if not provider or not template_id:
        return jsonify({"error": "Missing 'provider' or 'template_id' in request body."}), 400

    settings = settings_collection.find_one({"user_id": current_user_id})
    if not settings:
         return jsonify({"error": "User settings not found."}), 404

    state_config = {'provider': provider}
    if provider == 'aws':
        state_config['bucket'] = settings.get("terraform_s3_bucket")
        state_config['region'] = settings.get("aws_region", "us-east-1")
        if not state_config['bucket']:
             return jsonify({"error": "AWS S3 bucket for Terraform state not configured in settings."}), 400
    elif provider == 'azure':
        state_config['storage_account_name'] = settings.get("terraform_azure_storage_account")
        state_config['container_name'] = settings.get("terraform_azure_container")
        state_config['resource_group_name'] = settings.get("terraform_azure_resource_group")
        if not all([state_config.get('storage_account_name'), state_config.get('container_name'), state_config.get('resource_group_name')]):
            return jsonify({"error": "Azure Terraform state configuration incomplete in settings."}), 400
    elif provider == 'gcp':
        state_config['bucket'] = settings.get("terraform_gcs_bucket")
        if not state_config['bucket']:
             return jsonify({"error": "GCP GCS bucket for Terraform state not configured in settings."}), 400
    else:
        return jsonify({"error": f"Unsupported provider '{provider}' specified."}), 400

    tf_variables = {} # Destroy usually doesn't need specific variables
    result = run_terraform_command(template_id, provider, state_config, command_type="destroy", variables=tf_variables)

    # AWS-specific: Clear SQS settings if honeypot destroyed
    # Note: The original code checked for 'storage_honeypot', adjusted to 'aws_cloud_native_honeypot' based on deploy logic
    if result["status"] == "success" and template_id == "aws_cloud_native_honeypot" and provider == 'aws':
        logging.info(f"AWS Cloud Native Honeypot Destroyed. Clearing SQS settings for user {current_user_id}")
        try:
            sqsurl_collection.delete_one({"user_id": current_user_id})
            logging.info(f"Cleared SQS URL for user {current_user_id}")
            # If stop_monitoring was a function, call it here
            # from app import stop_monitoring # Example
            # stop_monitoring() # Placeholder call
        except Exception as e:
            logging.error(f"Error clearing SQS URL: {e}")

    status_code = 200 if result["status"] == "success" else 500
    try:
        deployments_collection.insert_one({
            "user_id": current_user_id,
            "template_id": template_id,
            "provider": provider,
            "action": "destroy",
            "status": result["status"],
            "timestamp": datetime.now(),
            "output": result.get("output", "")
        })
    except Exception as e:
        logging.error(f"Error logging deployment history: {e}")

    return jsonify(result), status_code

@terraform_bp.route('/variables/<provider>/<template_id>', methods=['GET'])
@jwt_required()
def get_terraform_variables(provider, template_id):
    base_template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'terraform', 'templates'))
    variables_file_path = os.path.join(base_template_path, provider, template_id, 'variables.tf')
    logging.debug(f"Checking for variables file at: {variables_file_path}")

    if not os.path.exists(variables_file_path):
        return jsonify([]), 200 # No variables file means no user input needed

    variables = parse_terraform_variables(variables_file_path)
    return jsonify(variables), 200