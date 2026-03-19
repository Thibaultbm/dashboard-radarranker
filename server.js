const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { fetchInstagramData, fetchHistoricalInsights } = require('./lib/instagram-api');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'history.json');

// Notion API configuration
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_API_BASE = 'https://api.notion.com/v1';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize history file if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [], dailyMetrics: {} }, null, 2));
}

// API Routes

// Get all historical data
app.get('/api/stats', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading stats:', error);
    res.status(500).json({ error: 'Failed to read stats' });
  }
});

// Get latest data
app.get('/api/stats/latest', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const latest = data.entries[data.entries.length - 1] || null;
    res.json(latest);
  } catch (error) {
    console.error('Error reading latest stats:', error);
    res.status(500).json({ error: 'Failed to read latest stats' });
  }
});

// Get daily metrics history
app.get('/api/stats/daily', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const dailyMetrics = data.dailyMetrics || {};
    
    // Convert to array sorted by date
    const dailyArray = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(dailyArray);
  } catch (error) {
    console.error('Error reading daily stats:', error);
    res.status(500).json({ error: 'Failed to read daily stats' });
  }
});

// Notion API Proxy - Route all Notion requests through here to avoid CORS
app.all('/api/notion-proxy/*', async (req, res) => {
  if (!NOTION_API_KEY) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' });
  }

  // Extract the Notion API path from the URL
  const notionPath = req.path.replace('/api/notion-proxy/', '');
  const notionUrl = `${NOTION_API_BASE}/${notionPath}`;

  try {
    const fetch = require('node-fetch');
    
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Notion proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual fetch
app.post('/api/fetch', async (req, res) => {
  try {
    const result = await fetchAndStoreData();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch historical data for a date range
app.post('/api/fetch/historical', async (req, res) => {
  try {
    const { since, until } = req.body;
    if (!since || !until) {
      return res.status(400).json({ error: 'Missing since or until parameter' });
    }
    
    const historicalData = await fetchHistoricalInsights(new Date(since).getTime(), new Date(until).getTime());
    
    // Merge into dailyMetrics
    let history = { entries: [], dailyMetrics: {} };
    if (fs.existsSync(DATA_FILE)) {
      history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    
    if (!history.dailyMetrics) {
      history.dailyMetrics = {};
    }
    
    for (const day of historicalData) {
      history.dailyMetrics[day.date] = {
        follower_count: day.follower_count || 0,
        reach: day.reach || 0,
        impressions: day.impressions || 0,
        accounts_engaged: day.accounts_engaged || 0,
        profile_views: day.profile_views || 0
      };
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
    
    res.json({ success: true, count: historicalData.length });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch and store data function
async function fetchAndStoreData() {
  console.log('[' + new Date().toISOString() + '] Fetching Instagram data...');
  
  const data = await fetchInstagramData();
  
  // Read existing history
  let history = { entries: [], dailyMetrics: {} };
  if (fs.existsSync(DATA_FILE)) {
    history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  
  // Add new entry with timestamp
  const entry = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('fr-FR'),
    ...data
  };
  
  history.entries.push(entry);
  
  // Keep only last 365 entries
  if (history.entries.length > 365) {
    history.entries = history.entries.slice(-365);
  }
  
  // Merge daily insights into dailyMetrics
  if (!history.dailyMetrics) {
    history.dailyMetrics = {};
  }
  
  if (data.dailyInsights) {
    for (const [date, metrics] of Object.entries(data.dailyInsights)) {
      history.dailyMetrics[date] = {
        follower_count: metrics.follower_count || 0,
        reach: metrics.reach || 0,
        impressions: metrics.impressions || 0,
        accounts_engaged: metrics.accounts_engaged || 0,
        profile_views: metrics.profile_views || 0
      };
    }
  }
  
  // Save
  fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
  
  console.log('[' + new Date().toISOString() + '] Data saved successfully');
  console.log(`  - Followers: ${data.followers}`);
  console.log(`  - Reach: ${data.reach}`);
  console.log(`  - Posts analyzed: ${data.recentMedia?.length || 0}`);
  
  return entry;
}

// Schedule daily fetch at 6 AM
const FETCH_TIME = process.env.FETCH_TIME || '0 6 * * *';
cron.schedule(FETCH_TIME, async () => {
  console.log('[' + new Date().toISOString() + '] Running scheduled fetch...');
  try {
    await fetchAndStoreData();
  } catch (error) {
    console.error('Scheduled fetch failed:', error);
  }
}, {
  timezone: 'Europe/Paris'
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dashboard Social running on http://localhost:${PORT}`);
  console.log(`📊 Data file: ${DATA_FILE}`);
  console.log(`⏰ Daily fetch scheduled at: ${FETCH_TIME}`);
});

module.exports = { fetchAndStoreData };