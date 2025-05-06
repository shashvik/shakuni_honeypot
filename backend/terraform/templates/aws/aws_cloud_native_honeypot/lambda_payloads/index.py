import os
import boto3
import json

print('Loading function')

# WARNING: This script simulates using hardcoded keys from environment variables.
# In a real-world scenario, you should rely on the Lambda execution role's permissions
# and avoid storing credentials directly in environment variables.
# Consider using AWS Secrets Manager or Parameter Store for sensitive data.

# Retrieve credentials and bucket name from environment variables
aws_access_key_id = os.environ.get('GITHUB_AUTOMATION_ACCESS_KEY_ID')
aws_secret_access_key = os.environ.get('GITHUB_AUTOMATION_SECRET_ACCESS_KEY')
bucket_name = os.environ.get('BUCKET_NAME')

# Simulate creating an S3 client using the environment variable credentials
# Note: If the Lambda execution role has S3 permissions, boto3 will use them by default.
# Explicitly passing keys like this is generally discouraged.
s3_client = None
if aws_access_key_id and aws_secret_access_key:
    print("Initializing S3 client with environment variable credentials (Not Recommended)")
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id, # Using the retrieved key ID
        aws_secret_access_key=aws_secret_access_key # Using the retrieved secret key
        # region_name can be added if needed, e.g., region_name='us-east-1'
    )
else:
    print("Initializing S3 client using Lambda execution role credentials.")
    s3_client = boto3.client('s3')

def handler(event, context):
    print(f"Received event: {json.dumps(event, indent=2)}")

    if not bucket_name:
        print("Error: BUCKET_NAME environment variable not set.")
        return {'statusCode': 500, 'body': json.dumps('Configuration error: Bucket name missing')}

    if not s3_client:
        # This case should ideally not happen if initialization above is correct
        print("Error: S3 client not initialized.")
        return {'statusCode': 500, 'body': json.dumps('Internal error: S3 client failed to initialize')}

    print(f"Simulating interaction with bucket: {bucket_name}")

    try:
        # Simulate getting the userlogs.csv object
        object_key = 'userlogs.csv'
        print(f"Attempting to get object: {object_key} from bucket: {bucket_name}")

        # In a real function, you would process the response:
        # response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        # content = response['Body'].read().decode('utf-8')
        # print("Simulated content retrieval successful.")
        # print(f"First 100 chars of content: {content[:100]}...")

        # For this dummy script, just print a success message
        print(f"Successfully simulated getting object '{object_key}'.")

        # Simulate listing objects (optional)
        # print(f"Simulating listing objects in bucket: {bucket_name}")
        # list_response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
        # objects = list_response.get('Contents', [])
        # print(f"Found {len(objects)} objects (up to 5 shown).")
        # for obj in objects:
        #     print(f" - {obj['Key']}")

        return {
            'statusCode': 200,
            'body': json.dumps(f'Successfully simulated processing for bucket {bucket_name}')
        }

    except Exception as e:
        # Attempt to determine if it's an access denied error
        error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', 'Unknown')
        print(f"Error during simulated S3 interaction: {e} (Code: {error_code})")
        if error_code == 'AccessDenied':
            print("Access Denied: Check IAM permissions for the user/role.")
        # Simulate logging the error
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error during simulation: {str(e)}')
        }