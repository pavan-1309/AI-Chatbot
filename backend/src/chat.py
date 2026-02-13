import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

bedrock = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CHAT_TABLE'])

def handler(event, context):
    try:
        body = json.loads(event['body'])
        user_message = body['message']
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Get conversation history
        history = get_history(user_id, limit=5)
        
        # Build messages array for Gemma
        messages = [{"role": "system", "content": "You are a helpful AI assistant."}]
        for item in history:
            messages.append({"role": "user", "content": item['userMessage']})
            messages.append({"role": "assistant", "content": item['botResponse']})
        messages.append({"role": "user", "content": user_message})
        
        # Call Bedrock with Gemma
        response = bedrock.invoke_model(
            modelId=os.environ['BEDROCK_MODEL_ID'],
            body=json.dumps({
                "messages": messages,
                "max_tokens": 512,
                "temperature": 0.7,
                "top_p": 0.9
            })
        )
        
        result = json.loads(response['body'].read())
        bot_response = result['choices'][0]['message']['content'].strip()
        
        # Save to DynamoDB
        timestamp = int(datetime.now().timestamp() * 1000)
        table.put_item(Item={
            'userId': user_id,
            'timestamp': timestamp,
            'userMessage': user_message,
            'botResponse': bot_response,
            'ttl': int(datetime.now().timestamp()) + 2592000  # 30 days
        })
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'response': bot_response})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

def get_history(user_id, limit=10):
    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': user_id},
        ScanIndexForward=False,
        Limit=limit
    )
    return list(reversed(response['Items']))
