const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Zoom API configuration
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

// Site name mapping


// Helper function to get friendly site name
function getFriendlySiteName(siteCode) {
  return SITE_NAME_MAP[siteCode] || siteCode;
}

// Helper function to get site code from friendly name
function getSiteCode(friendlyName) {
  const entry = Object.entries(SITE_NAME_MAP).find(([code, name]) => name === friendlyName);
  return entry ? entry[0] : friendlyName;
}

// Get OAuth token from Zoom
async function getZoomAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

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

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
    
    console.log('✅ Access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting Zoom access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Zoom');
  }
}

// Get call history for all users (with pagination)
async function getCallHistory(fromDate, toDate) {
  try {
    const token = await getZoomAccessToken();
    let allCallLogs = [];
    let nextPageToken = null;
    let pageCount = 0;

    do {
      pageCount++;
      const params = {
        from: fromDate,
        to: toDate,
        page_size: 300,
        type: 'all'
      };

      if (nextPageToken) {
        params.next_page_token = nextPageToken;
      }

      const response = await axios.get(
        'https://api.zoom.us/v2/phone/call_logs',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params
        }
      );

      const callLogs = response.data.call_logs || [];
      allCallLogs = allCallLogs.concat(callLogs);
      nextPageToken = response.data.next_page_token;

      console.log(`📄 Page ${pageCount}: fetched ${callLogs.length} records (total so far: ${allCallLogs.length})`);

    } while (nextPageToken);

    console.log(`✅ Successfully fetched all call logs: ${allCallLogs.length} total records across ${pageCount} page(s)`);
    return { call_logs: allCallLogs };
  } catch (error) {
    console.error('❌ Error fetching call history:', error.response?.data || error.message);
    throw new Error('Failed to fetch call history');
  }
}

// Process call data to aggregate by user
function aggregateCallsByUser2(callLogs) {
  const userStats = {};

  if (!callLogs || callLogs.length === 0) {
    console.log('⚠️  No call logs found');
    return [];
  }

  console.log(`📊 Processing ${callLogs.length} call logs`);

  callLogs.forEach(call => {
    const userId = call.owner?.id || call.user_id || 'unknown';
    const userName = call.owner?.name || call.caller_name || 'Unknown User';
    const extensionNumber = call.owner?.extension_number || null;
    const siteCode = call.site?.name || 'Unknown Site';
    const siteName = getFriendlySiteName(siteCode);

    if (!userStats[userId]) {
      userStats[userId] = {
        user: extensionNumber ? `${userName} (Ext: ${extensionNumber})` : userName,
        site: siteName,
        totalCalls: 0,
        inbound: 0,
        outbound: 0,
        totalCallTime: 0,
        callDurations: []
      };
    }

    userStats[userId].totalCalls++;
    
    if (call.direction === 'inbound') {
      userStats[userId].inbound++;
    } else if (call.direction === 'outbound') {
      userStats[userId].outbound++;
    }

    const duration = call.duration || 0;
    userStats[userId].totalCallTime += duration;
    userStats[userId].callDurations.push(duration);
  });

  const results = Object.values(userStats).map(user => {
    const avgCallTime = user.callDurations.length > 0
      ? user.callDurations.reduce((a, b) => a + b, 0) / user.callDurations.length
      : 0;

    return {
      user: user.user,
      site: user.site,
      totalCalls: user.totalCalls,
      inbound: user.inbound,
      outbound: user.outbound,
      averageCallTime: formatDuration(Math.floor(avgCallTime)),
      totalCallTime: formatDuration(user.totalCallTime)
    };
  }).sort((a, b) => b.totalCalls - a.totalCalls);

  console.log(`✅ Aggregated data for ${results.length} users`);
  
  return results;
}
// Process call data to aggregate by user
function aggregateCallsByUser(callLogs) {
  const userStats = {};

  if (!callLogs || callLogs.length === 0) {
    console.log('⚠️  No call logs found');
    return [];
  }

  // Filter out calls with duration = 0 (unanswered calls)
  const answeredCalls = callLogs.filter(call => call.duration > 0);
  
  console.log(`📊 Processing ${callLogs.length} call logs (${answeredCalls.length} answered, ${callLogs.length - answeredCalls.length} unanswered/missed)`);

  answeredCalls.forEach(call => {
    const userId = call.owner?.id || call.user_id || 'unknown';
    const userName = call.owner?.name || call.caller_name || 'Unknown User';
    const siteCode = call.site?.name || 'Unknown Site';
    const siteName = getFriendlySiteName(siteCode);

    if (!userStats[userId]) {
      userStats[userId] = {
        user: userName,
        site: siteName,
        totalCalls: 0,
        outbound: 0,
        totalCallTime: 0,
        totalOutboundCallTime: 0,
        callDurations: []
      };
    }

    userStats[userId].totalCalls++;
    
    const duration = call.duration || 0;
    userStats[userId].totalCallTime += duration;
    userStats[userId].callDurations.push(duration);
    
    // Track outbound calls and their duration
    if (call.direction === 'outbound') {
      userStats[userId].outbound++;
      userStats[userId].totalOutboundCallTime += duration;
    }
  });

  const results = Object.values(userStats).map(user => {
    return {
      user: user.user,
      site: user.site,
      totalCalls: user.totalCalls,
      outbound: user.outbound,
      totalCallTime: formatDuration(user.totalCallTime),
      totalCallTimeSeconds: user.totalCallTime, // For sorting
      totalOutboundCallTime: formatDuration(user.totalOutboundCallTime),
      totalOutboundCallTimeSeconds: user.totalOutboundCallTime // For sorting and highlighting
    };
  }).sort((a, b) => b.totalOutboundCallTimeSeconds - a.totalOutboundCallTimeSeconds); // Sort by outbound time descending

  console.log(`✅ Aggregated data for ${results.length} users`);
  
  return results;
}
// Process call data to aggregate by user
function aggregateCallsByUser3(callLogs) {
  const userStats = {};

  if (!callLogs || callLogs.length === 0) {
    console.log('⚠️  No call logs found');
    return [];
  }

  console.log(`📊 Processing ${callLogs.length} call logs`);

  callLogs.forEach(call => {
    const userId = call.owner?.id || call.user_id || 'unknown';
    const userName = call.owner?.name || call.caller_name || 'Unknown User';
    const siteCode = call.site?.name || 'Unknown Site';
    const siteName = getFriendlySiteName(siteCode);

    if (!userStats[userId]) {
      userStats[userId] = {
        user: userName,  // ← Removed extension number
        site: siteName,
        totalCalls: 0,
        inbound: 0,
        outbound: 0,
        totalCallTime: 0,
        callDurations: []
      };
    }

    userStats[userId].totalCalls++;
    
    if (call.direction === 'inbound') {
      userStats[userId].inbound++;
    } else if (call.direction === 'outbound') {
      userStats[userId].outbound++;
    }

    const duration = call.duration || 0;
    userStats[userId].totalCallTime += duration;
    userStats[userId].callDurations.push(duration);
  });

  const results = Object.values(userStats).map(user => {
    const avgCallTime = user.callDurations.length > 0
      ? user.callDurations.reduce((a, b) => a + b, 0) / user.callDurations.length
      : 0;

    return {
      user: user.user,
      site: user.site,
      totalCalls: user.totalCalls,
      inbound: user.inbound,
      outbound: user.outbound,
      averageCallTime: formatDuration(Math.floor(avgCallTime)),
      totalCallTime: formatDuration(user.totalCallTime)
    };
  }).sort((a, b) => b.totalCalls - a.totalCalls);

  console.log(`✅ Aggregated data for ${results.length} users`);
  
  return results;
}

// Format duration from seconds to HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// API Endpoints
app.get('/api/call-stats', async (req, res) => {
  try {
    const { from, to, site } = req.query;
    
    const toDate = to || new Date().toISOString().split('T')[0];
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`📞 Fetching call logs from ${fromDate} to ${toDate}${site ? ` for site: ${site}` : ''}`);

    const callData = await getCallHistory(fromDate, toDate);
    const callLogs = callData.call_logs || callData.calls || callData.data || [];
    
    let filteredLogs = callLogs;
    let siteCode = null;
    if (site) {
      siteCode = getSiteCode(site);
      filteredLogs = callLogs.filter(call => call.site?.name === siteCode);
      console.log(`Filtered to ${filteredLogs.length} call logs for site: ${site} (${siteCode})`);
    }
    
    console.log(`Found ${filteredLogs.length} call logs${site ? ` for site ${site}` : ''}`);
    
    const aggregatedStats = aggregateCallsByUser(filteredLogs);

    // ADD THIS LOGGING
    console.log('\n' + '='.repeat(60));
    console.log('TOP 5 USERS BEING SENT TO FRONTEND:');
    console.log('='.repeat(60));
    aggregatedStats.slice(0, 5).forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.user}`);
      console.log(`   Total: ${user.totalCalls}, Out: ${user.outbound}`);
      console.log(`   Total Time: ${user.totalCallTime}, Out Time: ${user.totalOutboundCallTime}`);
    });
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      data: aggregatedStats,
      dateRange: { from: fromDate, to: toDate },
      site: site || 'All Sites',
      siteCode: siteCode,
      timestamp: new Date().toISOString()  // Add timestamp
    });
  } catch (error) {
    console.error('❌ Error in /api/call-stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get list of sites
// Site name mapping
const SITE_NAME_MAP = {
  'UK - RDG': 'Reading',
  'US - Austin': 'Austin',
  'UK - MNC': 'Manchester',
  'US - San Diego': 'San Diego',
  'US - NY': 'New York',
  'Tank': 'Tank',
  'DE - Frankfurt': 'Frankfurt'
};

// ... rest of code ...

// Get list of sites - return pre-configured sites (no API call needed)
app.get('/api/sites', (req, res) => {
  try {
    // Return all configured sites directly from SITE_NAME_MAP
    const sites = Object.entries(SITE_NAME_MAP)
      .map(([code, name]) => ({
        code: code,
        name: name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`📍 Returning ${sites.length} configured sites`);

    res.json({
      success: true,
      sites: sites
    });
  } catch (error) {
    console.error('❌ Error fetching sites:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    zoomAuth: accessToken ? 'authenticated' : 'not authenticated'
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Zoom Phone Dashboard API Server     ║
║   Running on port ${PORT}                ║
╚════════════════════════════════════════╝
  `);
});