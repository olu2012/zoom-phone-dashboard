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

async function checkAllSites() {
  const token = await getAccessToken();
  const testDate = '2026-01-15';
  
  console.log('\n' + '='.repeat(80));
  console.log('ALL SITES IN ZOOM DATA');
  console.log('='.repeat(80));
  
  const response = await axios.get(
    'https://api.zoom.us/v2/phone/call_logs',
    {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        from: testDate,
        to: testDate,
        page_size: 300,
        type: 'all'
      }
    }
  );

  const callLogs = response.data.call_logs || [];
  
  // Extract all unique sites
  const sitesSet = new Set();
  callLogs.forEach(call => {
    if (call.site?.name) {
      sitesSet.add(call.site.name);
    }
  });
  
  const sites = Array.from(sitesSet).sort();
  
  console.log(`\nTotal unique sites found: ${sites.length}\n`);
  
  sites.forEach((site, idx) => {
    const callsForSite = callLogs.filter(c => c.site?.name === site).length;
    console.log(`${idx + 1}. "${site}" - ${callsForSite} calls`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('CURRENT SITE NAME MAPPING IN YOUR CODE:');
  console.log('='.repeat(80));
  
  const currentMapping = {
    'UK - RDG': 'Reading',
    'US - Austin': 'Austin',
    'UK - MNC': 'Manchester',
    'US - San Diego': 'San Diego',
    'US - NY': 'New York',
    'Tank': 'Tank'
  };
  
  console.log('\nCurrent mappings:');
  Object.entries(currentMapping).forEach(([code, name]) => {
    const exists = sites.includes(code);
    console.log(`  ${code} → ${name} ${exists ? '✓' : '✗ NOT FOUND IN DATA'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('SITES THAT NEED TO BE ADDED TO MAPPING:');
  console.log('='.repeat(80));
  
  const unmapped = sites.filter(site => !Object.keys(currentMapping).includes(site));
  
  if (unmapped.length > 0) {
    console.log('\nAdd these to your SITE_NAME_MAP:');
    unmapped.forEach(site => {
      console.log(`  '${site}': '${site}',  // ← Add friendly name`);
    });
  } else {
    console.log('\n✓ All sites are mapped!');
  }
  
  console.log('\n' + '='.repeat(80));
}

checkAllSites().catch(console.error);