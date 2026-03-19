const fetch = require('node-fetch');

const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '17841450596082889';
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const API_VERSION = 'v24.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Refresh token if needed
async function refreshTokenIfNeeded() {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return ACCESS_TOKEN;
  }
  
  try {
    const refreshUrl = `${BASE_URL}/oauth/access_token`;
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      fb_exchange_token: ACCESS_TOKEN
    });
    
    const res = await fetch(`${refreshUrl}?${params}`);
    const data = await res.json();
    
    if (data.access_token) {
      console.log('Token refreshed successfully');
      return data.access_token;
    }
  } catch (e) {
    console.warn('Token refresh failed:', e.message);
  }
  return ACCESS_TOKEN;
}

async function fetchInstagramData() {
  if (!ACCESS_TOKEN) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN not configured');
  }
  
  const currentToken = await refreshTokenIfNeeded();
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

  try {
    // 1. Get account info
    const accountUrl = `${BASE_URL}/${INSTAGRAM_ACCOUNT_ID}`;
    const accountParams = new URLSearchParams({
      fields: 'followers_count,follows_count,media_count',
      access_token: ACCESS_TOKEN
    });

    const accountRes = await fetch(`${accountUrl}?${accountParams}`);
    const accountData = await accountRes.json();

    if (accountData.error) {
      throw new Error(`Account API error: ${accountData.error.message}`);
    }

    // 2. Get insights for the last 30 days - REACH
    const reachInsights = await fetchMetric('reach', thirtyDaysAgo, now);
    
    // 3. Get all media to calculate historical engagement
    const mediaUrl = `${BASE_URL}/${INSTAGRAM_ACCOUNT_ID}/media`;
    const mediaParams = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
      limit: '100',
      access_token: ACCESS_TOKEN
    });

    const mediaRes = await fetch(`${mediaUrl}?${mediaParams}`);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      throw new Error(`Media API error: ${mediaData.error.message}`);
    }

    // 4. Calculate daily metrics from media
    const dailyMetrics = {};
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    const recentMedia = [];

    if (mediaData.data) {
      for (const media of mediaData.data) {
        const postDate = media.timestamp?.split('T')[0];
        
        // Aggregate by date
        if (postDate) {
          if (!dailyMetrics[postDate]) {
            dailyMetrics[postDate] = {
              date: postDate,
              likes: 0,
              comments: 0,
              saves: 0,
              shares: 0,
              reach: 0,
              impressions: 0,
              posts: 0
            };
          }
          
          dailyMetrics[postDate].likes += media.like_count || 0;
          dailyMetrics[postDate].comments += media.comments_count || 0;
          dailyMetrics[postDate].posts += 1;
        }
        
        totalLikes += media.like_count || 0;
        totalComments += media.comments_count || 0;
        
        // Get insights for recent posts (last 25)
        if (recentMedia.length < 25) {
          try {
            const mediaInsightsUrl = `${BASE_URL}/${media.id}/insights`;
            const mediaInsightsParams = new URLSearchParams({
              metric: 'reach,impressions,saved,shares',
              access_token: ACCESS_TOKEN
            });

            const mediaInsightsRes = await fetch(`${mediaInsightsUrl}?${mediaInsightsParams}`);
            const mediaInsightsData = await mediaInsightsRes.json();

            const metrics = {};
            if (mediaInsightsData.data) {
              for (const item of mediaInsightsData.data) {
                metrics[item.name] = item.values?.[0]?.value || 0;
              }
            }

            if (postDate && dailyMetrics[postDate]) {
              dailyMetrics[postDate].saves += metrics.saved || 0;
              dailyMetrics[postDate].shares += metrics.shares || 0;
              dailyMetrics[postDate].reach += metrics.reach || 0;
              dailyMetrics[postDate].impressions += metrics.impressions || 0;
            }

            totalSaves += metrics.saved || 0;
            totalShares += metrics.shares || 0;
            totalReach += metrics.reach || 0;
            totalImpressions += metrics.impressions || 0;

            recentMedia.push({
              id: media.id,
              caption: media.caption || '',
              media_type: media.media_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves: metrics.saved || 0,
              shares: metrics.shares || 0,
              reach: metrics.reach || 0,
              impressions: metrics.impressions || 0
            });
          } catch (e) {
            recentMedia.push({
              id: media.id,
              caption: media.caption || '',
              media_type: media.media_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves: 0, shares: 0, reach: 0, impressions: 0
            });
          }
        }
      }
    }

    // 5. Build historical data combining reach from API and engagement from media
    const historicalData = [];
    const dates = Object.keys(dailyMetrics).sort();
    
    for (const date of dates) {
      const dayData = dailyMetrics[date];
      const reachData = reachInsights[date] || { reach: 0 };
      
      historicalData.push({
        date: date,
        followers: accountData.followers_count || 0, // We don't have historical followers
        reach: reachData.reach || dayData.reach || 0,
        impressions: dayData.impressions || 0,
        likes: dayData.likes || 0,
        comments: dayData.comments || 0,
        saves: dayData.saves || 0,
        shares: dayData.shares || 0,
        posts: dayData.posts || 0,
        engagementRate: dayData.reach > 0 ? ((dayData.likes + dayData.comments) / dayData.reach * 100).toFixed(2) : 0
      });
    }

    return {
      // Account snapshot
      followers: accountData.followers_count || 0,
      following: accountData.follows_count || 0,
      mediaCount: accountData.media_count || 0,
      
      // Today's values
      reach: historicalData[historicalData.length - 1]?.reach || 0,
      impressions: historicalData[historicalData.length - 1]?.impressions || 0,
      accountsEngaged: 0, // Not available via API without special permissions
      profileViews: 0, // Not available
      
      // Aggregated metrics
      likes: totalLikes,
      comments: totalComments,
      saves: totalSaves,
      shares: totalShares,
      totalReach: totalReach,
      totalImpressions: totalImpressions,
      
      // Historical data for charts
      historicalData: historicalData,
      
      // Recent media
      recentMedia: recentMedia
    };

  } catch (error) {
    console.error('Error fetching Instagram data:', error);
    throw error;
  }
}

// Helper to fetch a specific metric
async function fetchMetric(metric, since, until) {
  const url = `${BASE_URL}/${INSTAGRAM_ACCOUNT_ID}/insights`;
  const params = new URLSearchParams({
    metric: metric,
    period: 'day',
    since: since.toString(),
    until: until.toString(),
    access_token: ACCESS_TOKEN
  });

  try {
    const res = await fetch(`${url}?${params}`);
    const data = await res.json();
    
    if (data.error) {
      console.warn(`Metric ${metric} error:`, data.error.message);
      return {};
    }

    const result = {};
    if (data.data && data.data[0] && data.data[0].values) {
      for (const value of data.data[0].values) {
        const date = value.end_time?.split('T')[0];
        if (date) {
          result[date] = { [metric]: value.value || 0 };
        }
      }
    }
    return result;
  } catch (e) {
    console.warn(`Failed to fetch metric ${metric}:`, e.message);
    return {};
  }
}

// Fetch historical data for initialization
async function fetchHistoricalInsights(days = 30) {
  const now = Math.floor(Date.now() / 1000);
  const since = now - (days * 24 * 60 * 60);
  
  // Get all data
  const data = await fetchInstagramData();
  return data.historicalData || [];
}

module.exports = { fetchInstagramData, fetchHistoricalInsights };
