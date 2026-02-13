const { SecretsManagerClient, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function updateSecret() {
  const config = {
    apiUrl: process.argv[2],
    userPoolId: process.argv[3],
    clientId: process.argv[4]
  };

  if (!config.apiUrl || !config.userPoolId || !config.clientId) {
    console.log('Usage: node update-secret.js <API_URL> <USER_POOL_ID> <CLIENT_ID>');
    console.log('Example: node update-secret.js https://xxx.execute-api.ap-south-1.amazonaws.com/prod ap-south-1_xxx xxx');
    process.exit(1);
  }

  try {
    await client.send(
      new UpdateSecretCommand({
        SecretId: 'chatbot/frontend/config',
        SecretString: JSON.stringify(config)
      })
    );
    console.log('✅ Secret updated successfully');
  } catch (error) {
    console.error('❌ Error updating secret:', error.message);
    process.exit(1);
  }
}

updateSecret();
