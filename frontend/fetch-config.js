const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function getConfig() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: 'chatbot/frontend/config2' })
    );
    const config = JSON.parse(response.SecretString);
    
    // Write to .env file for build process
    const fs = require('fs');
    const envContent = `REACT_APP_API_URL=${config.apiUrl}
REACT_APP_USER_POOL_ID=${config.userPoolId}
REACT_APP_CLIENT_ID=${config.clientId}`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ Configuration loaded from AWS Secrets Manager');
  } catch (error) {
    console.error('❌ Error fetching secrets:', error.message);
    process.exit(1);
  }
}

getConfig();
