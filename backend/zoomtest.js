const axios = require('axios');
require('dotenv').config();

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

console.log('Testing Zoom Authentication...');
console.log('Account ID:', ZOOM_ACCOUNT_ID);
console.log('Client ID:', ZOOM_CLIENT_ID);
console.log('Client Secret:', ZOOM_CLIENT_SECRET ? 'SET' : 'MISSING');

async function testAuth() {
  try {
    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    
    console.log('\nSending request to Zoom...');
    
    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      {},
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('\n✓ SUCCESS! Authentication working!');
    console.log('Access Token received:', response.data.access_token.substring(0, 20) + '...');
  } catch (error) {
    console.log('\n✗ FAILED! Authentication error:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
}

testAuth();