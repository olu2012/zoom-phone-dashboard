const axios = require('axios');
require('dotenv').config();

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

async function getAccessToken() {
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {},
    { headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data.access_token;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function verifyReadingOnly() {
  const token = await getAccessToken();
  const testDate = '2026-01-15';
  
  console.log('\n' + '='.repeat(80));
  console.log('CALCULATION VERIFICATION FOR JAN 15, 2026 - READING ONLY');
  console.log('='.repeat(80));
  
  const response = await axios.get(
    'https://api.zoom.us/v2/phone/call_logs',
    {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { from: testDate, to: testDate, page_size: 300, type: 'all' }
    }
  );

  const callLogs = response.data.call_logs || [];
  
  // Filter for Reading site only
  const readingCalls = callLogs.filter(call => call.site?.name === 'UK - RDG');
  const answeredCalls = readingCalls.filter(call => call.duration > 0);
  
  console.log(`\nTotal call logs (all sites): ${callLogs.length}`);
  console.log(`Reading calls only: ${readingCalls.length}`);
  console.log(`Answered Reading calls: ${answeredCalls.length}`);
  
  const userStats = {};
  
  answeredCalls.forEach(call => {
    const userId = call.owner?.id || call.user_id || 'unknown';
    const userName = call.owner?.name || call.caller_name || 'Unknown User';
    
    if (!userStats[userId]) {
      userStats[userId] = {
        name: userName,
        totalCalls: 0,
        outbound: 0,
        totalCallTime: 0,
        totalOutboundCallTime: 0
      };
    }
    
    userStats[userId].totalCalls++;
    userStats[userId].totalCallTime += call.duration;
    
    if (call.direction === 'outbound') {
      userStats[userId].outbound++;
      userStats[userId].totalOutboundCallTime += call.duration;
    }
  });
  
  const results = Object.values(userStats)
    .sort((a, b) => b.totalOutboundCallTime - a.totalOutboundCallTime);
  
  console.log('\n' + '='.repeat(80));
  console.log('READING SITE ONLY (Sorted by Outbound Time):');
  console.log('='.repeat(80));
  console.log(`${'Name'.padEnd(25)} | ${'Total'.padStart(5)} | ${'Out'.padStart(3)} | ${'Total Time'.padStart(10)} | ${'Out Time'.padStart(10)}`);
  console.log('-'.repeat(80));
  
  results.forEach(user => {
    console.log(
      `${user.name.padEnd(25)} | ` +
      `${user.totalCalls.toString().padStart(5)} | ` +
      `${user.outbound.toString().padStart(3)} | ` +
      `${formatDuration(user.totalCallTime).padStart(10)} | ` +
      `${formatDuration(user.totalOutboundCallTime).padStart(10)}`
    );
  });
  
  console.log('\n' + '='.repeat(80));
}

verifyReadingOnly().catch(console.error);