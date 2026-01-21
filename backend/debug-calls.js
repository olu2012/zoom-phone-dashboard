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
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data.access_token;
}

async function debugCallDuration() {
  const token = await getAccessToken();
  
  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const response = await axios.get(
    'https://api.zoom.us/v2/phone/call_logs',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        from: fromDate,
        to: toDate,
        page_size: 10
      }
    }
  );

  const callLogs = response.data.call_logs || [];
  
  console.log('\n=== CALL DURATION ANALYSIS ===\n');
  console.log(`Analyzing ${callLogs.length} sample calls:\n`);
  
  callLogs.forEach((call, index) => {
    console.log(`Call ${index + 1}:`);
    console.log(`  Caller: ${call.owner?.name || call.caller_name}`);
    console.log(`  Direction: ${call.direction}`);
    console.log(`  Date/Time: ${call.date_time}`);
    console.log(`  Duration (seconds): ${call.duration}`);
    console.log(`  Duration (formatted): ${formatDuration(call.duration)}`);
    
    // Check if there's a call_end_time
    if (call.call_end_time && call.date_time) {
      const startTime = new Date(call.date_time).getTime();
      const endTime = new Date(call.call_end_time).getTime();
      const calculatedDuration = Math.floor((endTime - startTime) / 1000);
      console.log(`  Start Time: ${call.date_time}`);
      console.log(`  End Time: ${call.call_end_time}`);
      console.log(`  Calculated Duration: ${calculatedDuration} seconds (${formatDuration(calculatedDuration)})`);
      
      if (calculatedDuration !== call.duration) {
        console.log(`  ⚠️  MISMATCH! API duration (${call.duration}s) vs Calculated (${calculatedDuration}s)`);
      }
    }
    
    // Check all available duration-related fields
    console.log(`  All duration fields:`);
    Object.keys(call).forEach(key => {
      if (key.toLowerCase().includes('duration') || key.toLowerCase().includes('time')) {
        console.log(`    ${key}: ${call[key]}`);
      }
    });
    
    console.log('');
  });
  
  // Calculate statistics
  const durations = callLogs.map(c => c.duration).filter(d => d > 0);
  if (durations.length > 0) {
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const avgDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log('\n=== STATISTICS ===');
    console.log(`Total calls: ${callLogs.length}`);
    console.log(`Calls with duration > 0: ${durations.length}`);
    console.log(`Average duration: ${avgDuration.toFixed(2)}s (${formatDuration(Math.floor(avgDuration))})`);
    console.log(`Min duration: ${minDuration}s (${formatDuration(minDuration)})`);
    console.log(`Max duration: ${maxDuration}s (${formatDuration(maxDuration)})`);
    console.log(`Total duration: ${totalDuration}s (${formatDuration(totalDuration)})`);
  }
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

debugCallDuration().catch(console.error);