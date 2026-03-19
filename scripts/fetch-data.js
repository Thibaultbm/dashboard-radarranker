#!/usr/bin/env node

// Script autonome pour récupérer les données Instagram
// Usage: node scripts/fetch-data.js

const { fetchInstagramData } = require('../lib/instagram-api');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'history.json');

async function fetchAndStoreData() {
  console.log('[' + new Date().toISOString() + '] Fetching Instagram data...');
  
  try {
    const data = await fetchInstagramData();
    
    // Read existing history
    let history = { entries: [] };
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
    
    // Keep only last 365 days
    if (history.entries.length > 365) {
      history.entries = history.entries.slice(-365);
    }
    
    // Save
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
    
    console.log('✅ Data saved successfully');
    console.log(`📊 Followers: ${data.followers}`);
    console.log(`📸 Media: ${data.mediaCount}`);
    console.log(`👁️ Impressions: ${data.impressions}`);
    console.log(`🎯 Reach: ${data.reach}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchAndStoreData();
