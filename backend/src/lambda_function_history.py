import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['CHAT_TABLE'])

def handler(event, context):
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        limit = int(event.get('queryStringParameters', {}).get('limit', 50))
        
        response = table.query(
            KeyConditionExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id},
            ScanIndexForward=False,
            Limit=limit
        )
        
        items = [{
            'timestamp': int(item['timestamp']),
            'userMessage': item['userMessage'],
            'botResponse': item['botResponse']
        } for item in response['Items']]
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'history': list(reversed(items))})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
