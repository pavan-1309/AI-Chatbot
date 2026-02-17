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
        model_id = body.get('model', os.environ['BEDROCK_MODEL_ID'])
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Get conversation history
        history = get_history(user_id, limit=5)
        
        # Build messages array
        messages = [{"role": "system", "content": "You are a helpful AI assistant."}]
        for item in history:
            messages.append({"role": "user", "content": item['userMessage']})
            messages.append({"role": "assistant", "content": item['botResponse']})
        messages.append({"role": "user", "content": user_message})
        
        # Prepare request based on model
        if 'claude' in model_id:
            # Use Converse API for Claude
            response = bedrock.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": user_message}]}],
                inferenceConfig={"maxTokens": 512, "temperature": 0.7}
            )
            bot_response = response['output']['message']['content'][0]['text']
        else:
            # Other models use invoke_model
            if 'llama3' in model_id or 'llama-3' in model_id:
                request_body = {
                    "prompt": f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{user_message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
                    "max_gen_len": 512,
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            elif 'mistral' in model_id:
                request_body = {
                    "prompt": f"<s>[INST] {user_message} [/INST]",
                    "max_tokens": 512,
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            else:
                # Gemma format
                request_body = {
                    "messages": messages,
                    "max_tokens": 512,
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            
            response = bedrock.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body)
            )
            result = json.loads(response['body'].read())
            
            if 'llama3' in model_id or 'llama-3' in model_id:
                bot_response = result['generation']
            elif 'mistral' in model_id:
                bot_response = result['outputs'][0]['text']
            else:
                bot_response = result['choices'][0]['message']['content']
        
        bot_response = bot_response.strip()
        
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
        import traceback
        error_details = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        print(f"Error details: {json.dumps(error_details)}")
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
