const axios = require('axios');
require('dotenv').config();

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

async function getAccessToken() {
  try {
    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    
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

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get access token');
    console.error('Error:', error.response?.data);
    return null;
  }
}

async function testEndpoint(token, url, name) {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   ✅ SUCCESS! Status: ${response.status}`);
    console.log(`   Response has data:`, response.data ? 'Yes' : 'No');
    return true;
  } catch (error) {
    console.log(`   ❌ FAILED! Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.code) {
      console.log(`   Code: ${error.response.data.code}`);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Zoom API Endpoint Tester\n');
  
  const token = await getAccessToken();
  
  if (!token) {
    console.log('\n❌ Cannot proceed without access token');
    console.log('Please check your credentials in .env file');
    return;
  }
  
  console.log('✅ Access token obtained successfully!\n');
  console.log('='.repeat(60));
  
  // Test different Zoom Phone endpoints
  const endpoints = [
    {
      name: 'Phone Call Logs',
      url: 'https://api.zoom.us/v2/phone/call_logs'
    },
    {
      name: 'Phone Metrics - Call Logs',
      url: 'https://api.zoom.us/v2/phone/metrics/call_logs'
    },
    {
      name: 'Phone Users',
      url: 'https://api.zoom.us/v2/phone/users'
    },
    {
      name: 'Account Phone Numbers',
      url: 'https://api.zoom.us/v2/phone/numbers'
    },
    {
      name: 'Reports - Telephone',
      url: 'https://api.zoom.us/v2/report/telephone'
    },
    {
      name: 'Phone Call History',
      url: 'https://api.zoom.us/v2/phone/call_history'
    }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    const success = await testEndpoint(token, endpoint.url, endpoint.name);
    if (success) successCount++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:');
  console.log(`   ${successCount} out of ${endpoints.length} endpoints succeeded`);
  console.log('\nℹ️  The working endpoints can be used in your server.js');
  console.log('   The error messages show which scopes are needed for failed endpoints\n');
}

main();