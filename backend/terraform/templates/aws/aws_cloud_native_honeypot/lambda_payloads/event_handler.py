import json
import os
import requests
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get API endpoint and key from environment variables
SHAKUNI_API_ENDPOINT = os.environ.get('SHAKUNI_API_ENDPOINT_URL')
SHAKUNI_API_KEY = os.environ.get('SHAKUNI_API_KEY') # Consider using Secrets Manager for production

def handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")

    if not SHAKUNI_API_ENDPOINT:
        logger.error("SHAKUNI_API_ENDPOINT_URL environment variable not set.")
        # Depending on requirements, you might return an error or just log
        return {'statusCode': 500, 'body': 'Configuration error: API endpoint URL missing'}

    if not SHAKUNI_API_KEY:
        logger.error("SHAKUNI_API_KEY environment variable not set.")
        # Depending on requirements, you might return an error or just log
        return {'statusCode': 500, 'body': 'Configuration error: API key missing'}

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': SHAKUNI_API_KEY
    }

    try:
        # The event payload from EventBridge is the 'detail' field for AWS API calls
        log_data = event # Send the whole event for now, API can parse

        response = requests.post(SHAKUNI_API_ENDPOINT, headers=headers, json=log_data, timeout=10)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        logger.info(f"Successfully sent event to Shakuni API. Status code: {response.status_code}")
        return {
            'statusCode': 200,
            'body': json.dumps('Event successfully forwarded to Shakuni API')
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Error sending event to Shakuni API: {e}")
        # Implement retry logic or dead-letter queue if needed
        return {
            'statusCode': 500,
            'body': json.dumps(f'Failed to forward event: {str(e)}')
        }
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'An unexpected error occurred: {str(e)}')
        }