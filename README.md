# AI Chatbot - Production Ready

Full-stack AI chatbot with **multi-model support** using AWS services and Bedrock integration.

## Architecture

- **Frontend**: React with Markdown support (S3 + CloudFront)
- **Backend**: Lambda + API Gateway
- **AI**: Amazon Bedrock with **3 models** (Gemma, Llama, Mistral)
- **Database**: DynamoDB with TTL
- **Auth**: Cognito with email verification
- **Config**: AWS Secrets Manager

## Features

✨ **Multi-Model Selection** - Switch between 3 AI models in real-time
📝 **Markdown Rendering** - Beautiful formatted responses
🔐 **Secure Authentication** - Email-based signup with OTP
💬 **Chat History** - 30-day auto-cleanup with DynamoDB TTL
🎨 **Modern UI** - Ultra-minimalist design inspired by ChatGPT
⚡ **Serverless** - Fully scalable AWS infrastructure
💰 **Cost-Effective** - ~$3-6/month for moderate usage

## Prerequisites

- AWS Account
- AWS CLI configured (`aws configure`)
- Node.js 18+

---

# Manual Setup Guide

## Step 1: Enable Bedrock Model Access

**Note**: Models auto-enable on first use. For marketplace models, first invocation activates them account-wide.

1. Go to **AWS Console** → **Amazon Bedrock** (ap-south-1 region)
2. Go to **Model catalog**
3. Search and open these models:
   - **Google Gemma 3-27B-IT** (default)
   - **Meta Llama 3 70B Instruct**
   - **Mistral Large**
4. Models will activate automatically when first invoked

## Step 2: Create DynamoDB Table

1. Go to **DynamoDB** → **Tables** → **Create table**
2. Settings:
   - **Table name**: `ChatHistory`
   - **Partition key**: `userId` (String)
   - **Sort key**: `timestamp` (Number)
   - **Table settings**: On-demand
3. Click **Create table**
4. After creation, go to **Additional settings** → **Time to Live**
5. Enable TTL with attribute name: `ttl`

## Step 3: Create AWS Secrets Manager Secret

1. Go to **AWS Secrets Manager** → **Store a new secret**
2. **Secret type**: Other type of secret
3. **Key/value pairs**: Add these (you'll update values later):
   ```json
   {
     "apiUrl": "PLACEHOLDER",
     "userPoolId": "PLACEHOLDER",
     "clientId": "PLACEHOLDER"
   }
   ```
4. **Secret name**: `chatbot/frontend/config`
5. Click **Next** → **Next** → **Store**
6. **Note**: You'll update these values after creating Cognito and API Gateway

## Step 4: Create Cognito User Pool

1. Go to **Cognito** → **User pools** → **Create user pool**
2. **Sign-in options**: Email
3. **Password policy**: Default
4. **MFA**: No MFA
5. **User account recovery**: Email only
6. **Self-registration**: Enabled
7. **Email provider**: Send email with Cognito
8. **User pool name**: `chatbot-users`
9. **App client name**: `chatbot-client`
10. **Authentication flows**: Check `ALLOW_USER_PASSWORD_AUTH`
11. Click **Create user pool**
12. **Save these values**:
    - User Pool ID (e.g., `ap-south-1_xxxxxx`)
    - App Client ID (from App integration tab)

## Step 5: Create Lambda Execution Role

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity**: AWS service → Lambda
3. **Permissions**: Attach these policies:
   - `AWSLambdaBasicExecutionRole`
   - `AWSMarketplaceMeteringRegisterUsage` (for Bedrock marketplace models)
4. Click **Next**, name it `ChatbotLambdaRole`
5. Click **Create role**
6. Open the role, click **Add permissions** → **Create inline policy**
7. JSON tab, paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/ChatHistory"
    }
  ]
}
```
8. Name it `BedrockDynamoDBAccess`, click **Create policy**

## Step 6: Create Lambda Functions

### 5.1 Chat Function

1. Go to **Lambda** → **Create function**
2. Settings:
   - **Function name**: `ChatFunction`
   - **Runtime**: Python 3.11
   - **Execution role**: Use existing role → `ChatbotLambdaRole`
3. Click **Create function**
4. **Code** tab → Upload from → `.zip file` or paste code from `backend/src/chat.py`
5. **Important**: Change handler to `lambda_function.handler` in Runtime settings
6. **Configuration** → **Environment variables** → Add:
   - `CHAT_TABLE` = `ChatHistory`
   - `BEDROCK_MODEL_ID` = `google.gemma-3-27b-it`
6. **Configuration** → **General configuration**:
   - Timeout: 30 seconds
   - Memory: 512 MB
7. Click **Deploy**

### 5.2 History Function

1. Create another function: `HistoryFunction`
2. Same settings as above
3. Copy code from `backend/src/history.py`
4. **Important**: Change handler to `lambda_function.handler` in Runtime settings
5. Add same environment variable: `CHAT_TABLE` = `ChatHistory`
6. Click **Deploy**

## Step 7: Create API Gateway

1. Go to **API Gateway** → **Create API** → **REST API** (not private)
2. Click **Build**
3. Settings:
   - **API name**: `ChatbotAPI`
   - **Endpoint Type**: Regional
4. Click **Create API**

### 6.1 Create Cognito Authorizer

1. Click **Authorizers** → **Create authorizer**
2. Settings:
   - **Name**: `CognitoAuth`
   - **Type**: Cognito
   - **Cognito User Pool**: Select your pool
   - **Token Source**: `Authorization`
3. Click **Create authorizer**

### 6.2 Create /chat Endpoint

1. Click **Resources** → **Actions** → **Create Resource**
   - **Resource Name**: `chat`
   - Enable CORS: ✓
2. Select `/chat` → **Actions** → **Create Method** → **POST**
3. Settings:
   - **Integration type**: Lambda Function
   - **Lambda Function**: `ChatFunction`
   - **Use Lambda Proxy integration**: ✓
4. Click **Save** → **OK**
5. Click **Method Request**:
   - **Authorization**: CognitoAuth
6. Click **Actions** → **Enable CORS** → **Yes**

### 6.3 Create /history Endpoint

1. **Actions** → **Create Resource**:
   - **Resource Name**: `history`
   - Enable CORS: ✓
2. Select `/history` → **Actions** → **Create Method** → **GET**
3. Settings:
   - **Integration type**: Lambda Function
   - **Lambda Function**: `HistoryFunction`
   - **Use Lambda Proxy integration**: ✓
4. Click **Save** → **OK**
5. Click **Method Request**:
   - **Authorization**: CognitoAuth
6. Click **Actions** → **Enable CORS** → **Yes**

### 6.4 Deploy API

1. **Actions** → **Deploy API**
2. **Deployment stage**: [New Stage]
3. **Stage name**: `prod`
4. Click **Deploy**
5. **Save the Invoke URL** (e.g., `https://xxxxx.execute-api.ap-south-1.amazonaws.com/prod`)

## Step 8: Update Secrets Manager

1. Go back to **Secrets Manager** → `chatbot/frontend/config`
2. Click **Retrieve secret value** → **Edit**
3. Update with actual values:
   ```json
   {
     "apiUrl": "https://xxxxx.execute-api.ap-south-1.amazonaws.com/prod",
     "userPoolId": "ap-south-1_xxxxxx",
     "clientId": "xxxxxxxxxxxxxxxxxxxxxxxxxx"
   }
   ```
4. Click **Save**

## Step 9: Create S3 Bucket for Frontend

1. Go to **S3** → **Create bucket**
2. Settings:
   - **Bucket name**: `chatbot-frontend-<your-unique-id>` (must be globally unique)
   - **Region**: Same as your API (ap-south-1 recommended)
   - **Block all public access**: Uncheck (we'll use CloudFront)
3. Click **Create bucket**
4. Go to bucket → **Properties** → **Static website hosting**
5. Enable it:
   - **Index document**: `index.html`
   - **Error document**: `index.html`
6. Click **Save**

## Step 10: Configure AWS CLI and Build Frontend

1. Ensure AWS CLI is configured with credentials that can read Secrets Manager:
```bash
aws configure
```

2. Build and deploy:
```bash
cd frontend
npm install  # Installs react-scripts and all dependencies (~300MB)
npm run build  # Fetches config from Secrets Manager and builds
aws s3 sync build/ s3://chatbot-frontend-hzlgj --delete
```

**Note**: If you get "react-scripts not found" error, ensure `package.json` has `"react-scripts": "^5.0.1"` in devDependencies.

## Step 11: Create CloudFront Distribution (Optional but Recommended)

1. Go to **CloudFront** → **Create distribution**
2. Settings:
   - **Origin domain**: Select your S3 bucket
   - **Origin access**: Origin access control settings (recommended)
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Default root object**: `index.html`
3. Click **Create distribution**
4. Wait 5-10 minutes for deployment
5. Update S3 bucket policy to allow CloudFront access (CloudFront will provide the policy)
6. **Access your app** at the CloudFront domain: `https://d2hkiaqeb2l7i2.cloudfront.net`
7. **Clear cache after updates**:
```bash
aws cloudfront create-invalidation --distribution-id d2hkiaqeb2l7i2 --paths "/*"
```

---

## Testing Your Chatbot

1. Open the CloudFront URL or S3 website endpoint
2. Click **Sign Up** and create an account
3. Check your email for verification code
4. Sign in and start chatting!

---

## Cost Estimate (Monthly)

- **Bedrock (3 models)**:
  - Gemma 3-27B: ~$0.50-1 per 1000 messages
  - Llama 3 70B: ~$2-3 per 1000 messages
  - Mistral Large: ~$1-2 per 1000 messages
- **Lambda**: Free tier covers ~1M requests
- **DynamoDB**: ~$1.25 for 1M reads/writes (30-day TTL auto-cleanup)
- **API Gateway**: Free tier covers 1M requests
- **S3**: ~$0.50 for hosting
- **CloudFront**: Free tier covers 1TB transfer
- **Secrets Manager**: $0.40/month per secret

**Total: ~$3-6/month for moderate usage (mixed model usage)**

---

## Troubleshooting

**Bedrock Access Denied:**
- Verify model access is enabled in Bedrock console
- Check Lambda role has `bedrock:InvokeModel` permission

**CORS Errors:**
- Enable CORS on API Gateway for both methods
- Redeploy API after CORS changes

**Authentication Fails:**
- Verify User Pool ID and Client ID in Secrets Manager
- Check Cognito authorizer is attached to API methods
- Run `node fetch-config.js` to refresh configuration

**Lambda Timeout:**
- Increase timeout to 30 seconds in Lambda configuration
- Check CloudWatch Logs for errors

**Lambda Handler Error:**
- Ensure handler is set to `lambda_function.handler` (not `chat.handler`)
- Function name must match: `lambda_function.py` with `handler` function

**HTML Entities in Responses:**
- Fixed: App now decodes HTML entities (&#39;, &quot;, etc.)
- Markdown rendering enabled with react-markdown

---

## Project Structure

```
AI-CHATBOT/
├── backend/src/
│   ├── chat.py          # Chat Lambda (Gemma integration)
│   └── history.py       # History retrieval Lambda
├── frontend/
│   ├── src/
│   │   ├── App.js       # React app with markdown rendering
│   │   ├── auth.js      # Cognito authentication
│   │   ├── chat.js      # API communication
│   │   └── App.css      # Ultra-modern minimalist UI
│   ├── fetch-config.js  # Secrets Manager config fetcher
│   └── package.json     # Dependencies (react-scripts 5.0.1)
└── README.md            # This file
```

## Deployed Resources

- **Region**: ap-south-1 (Mumbai)
- **S3 Bucket**: chatbot-frontend-hzlgj
- **CloudFront**: d2hkiaqeb2l7i2.cloudfront.net
- **Models**: 
  - google.gemma-3-27b-it (default)
  - meta.llama3-70b-instruct-v1:0
  - mistral.mistral-large-2402-v1:0
- **Secrets**: chatbot/frontend/config

## Available AI Models

| Model | Provider | Best For | Speed | Cost |
|-------|----------|----------|-------|------|
| Gemma 3-27B | Google | General chat, fast responses | ⚡⚡⚡ | $ |
| Llama 3 70B | Meta | Complex reasoning, detailed answers | ⚡⚡ | $$ |
| Mistral Large | Mistral AI | Balanced performance | ⚡⚡ | $$ |
