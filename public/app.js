// Dashboard Application - Dark Mode Edition
let charts = {};
let currentPeriod = 14; // Default 14 days
let allData = null;

// Notion API configuration
const NOTION_API_URL = '/api/notion-proxy';
const PROCESS_DB_ID = '20683715fd0b8041ab74000b05dac51e';
const SUIVI_DB_ID = '3cea6abf74624a0c80c33c9ba6b43eef';

// Jour mapping pour les checkboxes
const JOURS_MAP = {
    'Monday': 'L',
    'Tuesday': 'M',
    'Wednesday': 'Me',
    'Thursday': 'J',
    'Friday': 'V',
    'Saturday': 'S',
    'Sunday': 'D'
};

// Chart.js default configuration for dark mode
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Calculate trend percentage
function calculateTrend(current, previous) {
    if (!previous || previous === 0) return { value: 0, positive: true };
    const change = ((current - previous) / previous) * 100;
    return {
        value: Math.abs(change).toFixed(1),
        positive: change >= 0
    };
}

// Update trend indicator
function updateTrendIndicator(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const arrow = trend.positive ? '↑' : '↓';
    const className = trend.positive ? 'positive' : 'negative';
    
    element.innerHTML = `${arrow} ${trend.value}%`;
    element.className = `stat-trend ${className}`;
}

// Filter data by period
function filterDataByPeriod(data, days) {
    if (!data || !data.entries) return data;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Filter entries by timestamp
    const filtered = data.entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
    });
    
    // Also filter historicalData if it exists
    let filteredHistorical = data.historicalData;
    if (filteredHistorical) {
        filteredHistorical = filteredHistorical.filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= cutoffDate;
        });
    }
    
    return {
        ...data,
        entries: filtered.length > 0 ? filtered : data.entries,
        historicalData: filteredHistorical || data.historicalData
    };
}

// Format numbers
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('fr-FR');
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short'
    });
}

// Initialize charts
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: '#1c2128',
                titleColor: '#f0f6fc',
                bodyColor: '#8b949e',
                borderColor: '#30363d',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: true
            }
        },
        scales: {
            x: {
                grid: {
                    color: '#21262d',
                    drawBorder: false
                },
                ticks: {
                    color: '#6e7681'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#21262d',
                    drawBorder: false
                },
                ticks: {
                    color: '#6e7681',
                    callback: function(value) {
                        return formatNumber(value);
                    }
                }
            }
        }
    };

    // Followers Chart - Blue gradient
    const followersCtx = document.getElementById('followersChart').getContext('2d');
    const followersGradient = followersCtx.createLinearGradient(0, 0, 0, 300);
    followersGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    followersGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    
    charts.followers = new Chart(followersCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Followers',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: followersGradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#1c2128',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: chartOptions
    });

    // Reach Chart - Blue and Purple
    const reachCtx = document.getElementById('reachChart').getContext('2d');
    charts.reach = new Chart(reachCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Reach',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'Impressions',
                    data: [],
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: chartOptions
    });

    // Engagement Chart - Red and Blue
    const engagementCtx = document.getElementById('engagementChart').getContext('2d');
    const likesGradient = engagementCtx.createLinearGradient(0, 0, 0, 300);
    likesGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    likesGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    
    const commentsGradient = engagementCtx.createLinearGradient(0, 0, 0, 300);
    commentsGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    commentsGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    
    charts.engagement = new Chart(engagementCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Likes',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: likesGradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#1c2128',
                    pointBorderWidth: 2,
                    pointRadius: 3
                },
                {
                    label: 'Commentaires',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: commentsGradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#1c2128',
                    pointBorderWidth: 2,
                    pointRadius: 3
                }
            ]
        },
        options: chartOptions
    });

    // Engagement Rate Chart - Green
    const engagementRateCtx = document.getElementById('engagementRateChart').getContext('2d');
    const rateGradient = engagementRateCtx.createLinearGradient(0, 0, 0, 300);
    rateGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    rateGradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
    
    charts.engagementRate = new Chart(engagementRateCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Taux d\'engagement (%)',
                data: [],
                borderColor: '#22c55e',
                backgroundColor: rateGradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#1c2128',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...chartOptions.scales.y.ticks,
                        callback: function(value) {
                            return value.toFixed(2) + '%';
                        }
                    }
                }
            }
        }
    });
}

// Update stat cards with trends
function updateStatCards(latest, previous, entries) {
    // Calculate engaged accounts from recent media if not available
    let accountsEngaged = latest.accountsEngaged || 0;
    let profileViews = latest.profileViews || 0;
    
    // If accountsEngaged is 0, estimate from recent media engagement
    if (accountsEngaged === 0 && latest.recentMedia) {
        const totalEngagement = latest.recentMedia.reduce((sum, post) => {
            return sum + (post.likes || 0) + (post.comments || 0);
        }, 0);
        accountsEngaged = Math.round(totalEngagement * 0.3); // Estimate 30% are unique accounts
    }
    
    // If profileViews is 0, estimate from reach
    if (profileViews === 0 && latest.reach) {
        profileViews = Math.round(latest.reach * 0.15); // Estimate 15% of reach views profile
    }
    
    document.getElementById('followers').textContent = formatNumber(latest.followers || 0);
    document.getElementById('mediaCount').textContent = formatNumber(latest.mediaCount || 0);
    document.getElementById('accountsEngaged').textContent = formatNumber(accountsEngaged);
    document.getElementById('reach').textContent = formatNumber(latest.reach || 0);
    document.getElementById('likes').textContent = formatNumber(latest.likes || 0);
    document.getElementById('comments').textContent = formatNumber(latest.comments || 0);
    document.getElementById('saves').textContent = formatNumber(latest.saves || 0);
    document.getElementById('profileViews').textContent = formatNumber(profileViews);
    
    // Update trends
    if (previous) {
        updateTrendIndicator('followersTrend', calculateTrend(latest.followers, previous.followers));
        updateTrendIndicator('mediaCountTrend', calculateTrend(latest.mediaCount, previous.mediaCount));
        
        const prevAccountsEngaged = previous.accountsEngaged || (previous.recentMedia ? 
            Math.round(previous.recentMedia.reduce((sum, post) => sum + (post.likes || 0) + (post.comments || 0), 0) * 0.3) : 0);
        updateTrendIndicator('accountsEngagedTrend', calculateTrend(accountsEngaged, prevAccountsEngaged));
        
        updateTrendIndicator('reachTrend', calculateTrend(latest.reach, previous.reach));
        updateTrendIndicator('likesTrend', calculateTrend(latest.likes, previous.likes));
        updateTrendIndicator('commentsTrend', calculateTrend(latest.comments, previous.comments));
        updateTrendIndicator('savesTrend', calculateTrend(latest.saves, previous.saves));
        
        const prevProfileViews = previous.profileViews || Math.round((previous.reach || 0) * 0.15);
        updateTrendIndicator('profileViewsTrend', calculateTrend(profileViews, prevProfileViews));
    }
    
    document.getElementById('lastUpdate').textContent = 'Dernière mise à jour: ' + 
        new Date(latest.timestamp).toLocaleString('fr-FR');
}

// Update charts with data
function updateCharts(entries, dailyMetrics) {
    // Sort entries by date
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Take last 30 entries for display
    const recentEntries = entries.slice(-30);
    
    const labels = recentEntries.map(e => formatDate(e.timestamp));
    
    // Update Followers Chart
    charts.followers.data.labels = labels;
    charts.followers.data.datasets[0].data = recentEntries.map(e => e.followers || 0);
    charts.followers.update();
    
    // Update Reach Chart with daily metrics if available
    if (dailyMetrics && Object.keys(dailyMetrics).length > 0) {
        const sortedDates = Object.keys(dailyMetrics).sort();
        const recentDates = sortedDates.slice(-30);
        
        charts.reach.data.labels = recentDates.map(d => formatDate(d));
        charts.reach.data.datasets[0].data = recentDates.map(d => dailyMetrics[d].reach || 0);
        charts.reach.data.datasets[1].data = recentDates.map(d => dailyMetrics[d].impressions || 0);
        charts.reach.update();
    } else {
        charts.reach.data.labels = labels;
        charts.reach.data.datasets[0].data = recentEntries.map(e => e.reach || 0);
        charts.reach.data.datasets[1].data = recentEntries.map(e => e.totalImpressions || e.impressions || 0);
        charts.reach.update();
    }
    
    // Update Engagement Chart
    charts.engagement.data.labels = labels;
    charts.engagement.data.datasets[0].data = recentEntries.map(e => e.likes || 0);
    charts.engagement.data.datasets[1].data = recentEntries.map(e => e.comments || 0);
    charts.engagement.update();
    
    // Update Engagement Rate Chart
    charts.engagementRate.data.labels = labels;
    charts.engagementRate.data.datasets[0].data = recentEntries.map(e => {
        const followers = e.followers || 1;
        const engagement = (e.likes || 0) + (e.comments || 0) + (e.saves || 0);
        return ((engagement / followers) * 100).toFixed(2);
    });
    charts.engagementRate.update();
}

// Display recent posts
// Type icons
const typeIcons = {
    VIDEO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" /></svg>`,
    CAROUSEL_ALBUM: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.47-5.47a1.5 1.5 0 00-2.12 0L3 16.06zm6.53-1.527a.75.75 0 00-1.06 0l-2.47 2.47V6a.75.75 0 00.75-.75h16.5a.75.75 0 01.75.75v11.253l-2.47-2.47a.75.75 0 00-1.06 0l-1.47 1.47 1.97 1.97a.75.75 0 11-1.06 1.06l-5.47-5.47a.75.75 0 00-1.06 0l-2.97 2.97z" clip-rule="evenodd" /></svg>`,
    IMAGE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.47-5.47a1.5 1.5 0 00-2.12 0L3 16.06z" clip-rule="evenodd" /></svg>`
};

// Current sort state
let currentSort = { field: 'timestamp', direction: 'desc' };

function getMediaTypeLabel(type) {
    const labels = {
        VIDEO: 'Reel',
        CAROUSEL_ALBUM: 'Carrousel',
        IMAGE: 'Photo'
    };
    return labels[type] || type;
}

function displayPosts(posts) {
    const container = document.getElementById('postsGrid');
    container.innerHTML = '';

    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="loading">Aucune publication récente</p>';
        return;
    }

    // Sort posts based on current sort
    const sortedPosts = [...posts].sort((a, b) => {
        let aVal, bVal;
        switch (currentSort.field) {
            case 'likes':
                aVal = (a.likes || a.like_count || 0);
                bVal = (b.likes || b.like_count || 0);
                break;
            case 'comments':
                aVal = (a.comments || a.comments_count || 0);
                bVal = (b.comments || b.comments_count || 0);
                break;
            case 'views':
                aVal = (a.impressions || a.reach || 0);
                bVal = (b.impressions || b.reach || 0);
                break;
            case 'timestamp':
            default:
                aVal = new Date(a.timestamp).getTime();
                bVal = new Date(b.timestamp).getTime();
        }
        return currentSort.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Group by type
    const grouped = { VIDEO: [], CAROUSEL_ALBUM: [], IMAGE: [] };
    sortedPosts.forEach(post => {
        const type = post.media_type || 'IMAGE';
        if (grouped[type]) grouped[type].push(post);
        else grouped.IMAGE.push(post);
    });

    // Create filter and sort container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'post-controls';

    // Type filters
    const filterContainer = document.createElement('div');
    filterContainer.className = 'post-filters';
    filterContainer.innerHTML = `
        <button class="filter-btn active" data-filter="all">Tous (${sortedPosts.length})</button>
        <button class="filter-btn" data-filter="VIDEO">Reels (${grouped.VIDEO.length})</button>
        <button class="filter-btn" data-filter="CAROUSEL_ALBUM">Carrousels (${grouped.CAROUSEL_ALBUM.length})</button>
        <button class="filter-btn" data-filter="IMAGE">Photos (${grouped.IMAGE.length})</button>
    `;
    controlsContainer.appendChild(filterContainer);

    // Sort dropdown
    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-container';
    sortContainer.innerHTML = `
        <label>Trier par :</label>
        <select id="sortSelect" class="sort-select">
            <option value="timestamp-desc" ${currentSort.field === 'timestamp' && currentSort.direction === 'desc' ? 'selected' : ''}>Plus récent</option>
            <option value="timestamp-asc" ${currentSort.field === 'timestamp' && currentSort.direction === 'asc' ? 'selected' : ''}>Plus ancien</option>
            <option value="likes-desc" ${currentSort.field === 'likes' && currentSort.direction === 'desc' ? 'selected' : ''}>Likes (plus → moins)</option>
            <option value="likes-asc" ${currentSort.field === 'likes' && currentSort.direction === 'asc' ? 'selected' : ''}>Likes (moins → plus)</option>
            <option value="comments-desc" ${currentSort.field === 'comments' && currentSort.direction === 'desc' ? 'selected' : ''}>Commentaires (plus → moins)</option>
            <option value="comments-asc" ${currentSort.field === 'comments' && currentSort.direction === 'asc' ? 'selected' : ''}>Commentaires (moins → plus)</option>
            <option value="views-desc" ${currentSort.field === 'views' && currentSort.direction === 'desc' ? 'selected' : ''}>Vues (plus → moins)</option>
            <option value="views-asc" ${currentSort.field === 'views' && currentSort.direction === 'asc' ? 'selected' : ''}>Vues (moins → plus)</option>
        </select>
    `;
    controlsContainer.appendChild(sortContainer);
    container.appendChild(controlsContainer);
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'posts-grid';
    grid.id = 'postsGridInner';
    container.appendChild(grid);
    
    function renderPosts(postsToRender) {
        grid.innerHTML = '';
        postsToRender.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.dataset.type = post.media_type || 'IMAGE';
            
            const imageUrl = post.media_url || '';
            const caption = post.caption || 'Sans légende';
            const likes = post.likes || post.like_count || 0;
            const comments = post.comments || post.comments_count || 0;
            const saves = post.saves || 0;
            const shares = post.shares || 0;
            const type = post.media_type || 'IMAGE';
            const typeIcon = typeIcons[type] || typeIcons.IMAGE;
            const typeLabel = getMediaTypeLabel(type);
            const permalink = post.permalink || '#';
            
            const isVideo = type === 'VIDEO';

            card.innerHTML = `
                <a href="${permalink}" target="_blank" class="post-link">
                    <div class="post-image-wrapper">
                        ${imageUrl && !isVideo ?
                            `<img src="${imageUrl}" alt="${typeLabel}" class="post-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''
                        }
                        ${isVideo ? `
                        <div class="video-thumbnail">
                            <div class="video-placeholder">
                                ${typeIcon}
                            </div>
                            <div class="video-overlay">
                                <div class="play-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="play-icon">
                                        <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                                <span class="video-label">Voir sur Instagram</span>
                            </div>
                        </div>
                        ` : `
                        <div class="post-image-placeholder" style="${imageUrl ? 'display:none;' : ''}">
                            ${typeIcon}
                        </div>
                        `}
                        <div class="post-type-badge">
                            ${typeIcon}
                            <span>${typeLabel}</span>
                        </div>
                    </div>
                    <div class="post-info">
                        <p class="post-caption">${caption.substring(0, 100)}${caption.length > 100 ? '...' : ''}</p>
                        <div class="post-stats">
                            <span class="post-stat likes" title="Likes">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                                ${formatNumber(likes)}
                            </span>
                            <span class="post-stat comments" title="Commentaires">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clip-rule="evenodd" />
                                </svg>
                                ${formatNumber(comments)}
                            </span>
                            ${saves > 0 ? `
                            <span class="post-stat saves" title="Sauvegardes">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clip-rule="evenodd" />
                                </svg>
                                ${formatNumber(saves)}
                            </span>
                            ` : ''}
                            ${shares > 0 ? `
                            <span class="post-stat shares" title="Partages">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path fill-rule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clip-rule="evenodd" />
                                </svg>
                                ${formatNumber(shares)}
                            </span>
                            ` : ''}
                        </div>
                    </div>
                </a>
            `;
            
            grid.appendChild(card);
        });
    }
    
    // Initial render
    renderPosts(posts);
    
    // Filter functionality
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            let filteredPosts = filter === 'all' ? sortedPosts : sortedPosts.filter(p => p.media_type === filter);
            renderPosts(filteredPosts);
        });
    });

    // Sort functionality
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', (e) => {
        const [field, direction] = e.target.value.split('-');
        currentSort = { field, direction };
        displayPosts(posts); // Re-render with new sort
    });
}

// Fetch data from API
async function fetchData() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        allData = data;
        
        if (data.entries && data.entries.length > 0) {
            // Filter by current period
            const filteredData = filterDataByPeriod(data, currentPeriod);
            
            const entries = filteredData.entries || data.entries;
            const latest = entries[entries.length - 1];
            const previous = entries.length > 1 ? entries[entries.length - 2] : null;
            
            updateStatCards(latest, previous, entries);
            updateCharts(entries, filteredData.dailyMetrics || data.dailyMetrics);
            if (latest.recentMedia) {
                displayPosts(latest.recentMedia);
            }
        } else {
            document.getElementById('lastUpdate').textContent = 'Aucune donnée disponible';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('lastUpdate').textContent = 'Erreur de chargement';
    }
}

// Setup period filter buttons
function setupPeriodFilters() {
    const buttons = document.querySelectorAll('.period-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = parseInt(btn.dataset.days);
            fetchData();
        });
    });
}

// Trigger manual refresh
async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Chargement...
    `;
    
    try {
        const response = await fetch('/api/fetch', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            await fetchData();
        } else {
            alert('Erreur lors de la mise à jour: ' + result.error);
        }
    } catch (error) {
        console.error('Error refreshing:', error);
        alert('Erreur lors de la mise à jour');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rafraîchir
        `;
    }
}

// Add spin animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Fetch productivity data from Notion
async function fetchProductivityData() {
    try {
        // Récupérer les tâches de Process Marketing
        const response = await fetch(`${NOTION_API_URL}/data_sources/${PROCESS_DB_ID}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch productivity data');
        
        const data = await response.json();
        const tasks = data.results || [];
        
        // Déterminer le jour actuel
        const today = new Date();
        const jourSemaine = today.toLocaleDateString('en-US', { weekday: 'long' });
        const checkboxProp = JOURS_MAP[jourSemaine];
        
        let total = 0;
        let faites = 0;
        const nomsFaites = [];
        
        tasks.forEach(task => {
            const props = task.properties || {};
            const nom = props['Tâche']?.title?.[0]?.text?.content || 'Sans nom';
            const checkbox = props[checkboxProp]?.checkbox || false;
            
            total++;
            if (checkbox) {
                faites++;
                nomsFaites.push(nom);
            }
        });
        
        const taux = total > 0 ? Math.round((faites / total) * 100) : 0;
        
        // Mettre à jour l'UI
        document.getElementById('productivityRate').textContent = taux + '%';
        document.getElementById('tasksDone').textContent = `${faites}/${total}`;
        
        // Mettre à jour la liste des tâches
        const taskList = document.getElementById('todayTasks');
        if (nomsFaites.length > 0) {
            taskList.innerHTML = nomsFaites.map(nom => `<li>${nom}</li>`).join('');
        } else {
            taskList.innerHTML = '<li class="empty">Aucune tâche cochée aujourd\'hui</li>';
        }
        
        // Récupérer l'historique pour la moyenne hebdo
        await fetchWeeklyAverage();
        
    } catch (error) {
        console.error('Error fetching productivity:', error);
        document.getElementById('productivityRate').textContent = '--%';
        document.getElementById('tasksDone').textContent = '--/--';
        document.getElementById('todayTasks').innerHTML = '<li class="empty">Erreur de chargement</li>';
    }
}

// Fetch weekly average from Suivi Quotidien
async function fetchWeeklyAverage() {
    try {
        const response = await fetch(`${NOTION_API_URL}/data_sources/${SUIVI_DB_ID}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sorts: [{ property: 'Date', direction: 'descending' }],
                page_size: 7
            })
        });
        
        if (!response.ok) throw new Error('Failed to fetch weekly data');
        
        const data = await response.json();
        const entries = data.results || [];
        
        if (entries.length > 0) {
            // Calculer la moyenne des taux
            const totalTaux = entries.reduce((sum, entry) => {
                const taux = entry.properties?.['Taux']?.number || 0;
                return sum + (taux * 100);
            }, 0);
            
            const avg = Math.round(totalTaux / entries.length);
            document.getElementById('weeklyAvg').textContent = avg + '%';
        } else {
            document.getElementById('weeklyAvg').textContent = '--%';
        }
    } catch (error) {
        console.error('Error fetching weekly average:', error);
        document.getElementById('weeklyAvg').textContent = '--%';
    }
}

// Fetch content data (mock for now - will be connected to actual tracking)
async function fetchContentData() {
    // Pour l'instant, données statiques ou à récupérer d'une autre source
    // Tu pourras connecter ça à ta base de données de contenu plus tard
    document.getElementById('linkedinPosts').textContent = '2';
    document.getElementById('xPosts').textContent = '0';
    document.getElementById('shortsReady').textContent = '3';
    document.getElementById('youtubeVideos').textContent = '0';
}

// Workflow data structure (for Mermaid diagrams)
const workflows = {
    seo: {
        name: 'SEO & Newsletter',
        diagram: `graph LR
            A["SORANK<br/><small>SEO Tool</small>"]:::blue --> B["Clients<br/><small>User Base</small>"]:::gray
            B --> C["Newsletter<br/><small>Content</small>"]:::blue
            C --> D["MAKE<br/><small>Automation</small>"]:::purple
            D --> E["BREVO<br/><small>Email Dispatch</small>"]:::green`
    },
    instagram: {
        name: 'Instagram & Malala',
        diagram: `graph LR
            A["INSTAGRAM<br/><small>Content Source</small>"]:::orange --> B["Malala<br/><small>Social Manager</small>"]:::blue
            B --> C["ManyChat<br/><small>Chatbot</small>"]:::purple
            C --> D["WhatsApp<br/><small>Direct Messages</small>"]:::green`
    },
    linkedin: {
        name: 'LinkedIn',
        diagram: `graph LR
            A["Content<br/><small>Creation</small>"]:::blue --> B["LINKEDIN<br/><small>Publishing</small>"]:::blue
            B --> C["Engagement<br/><small>& Replies</small>"]:::orange`
    },
    coldmail: {
        name: 'Cold Mailing',
        diagram: `graph LR
            A["Target<br/><small>Prospects</small>"]:::gray --> B["Kassi<br/><small>Prospection</small>"]:::blue
            B --> C["Email<br/><small>Outreach</small>"]:::orange
            C --> D["Follow-up<br/><small>Sequence</small>"]:::purple`
    },
    paiements: {
        name: 'Paiements & Stripe',
        diagram: `graph LR
            A["Clients<br/><small>Sorank Users</small>"]:::gray --> B["STRIPE<br/><small>Payment Gateway</small>"]:::blue
            B --> C["Invoicing<br/><small>System</small>"]:::green
            C --> D["Accounting<br/><small>(Brevo)</small>"]:::purple`
    }
};

let currentWorkflow = 'seo';

function renderWorkflow(workflowId) {
    const workflow = workflows[workflowId];
    if (!workflow) return;
    
    const canvas = document.getElementById('workflowCanvas');
    if (!canvas) return;
    
    // Clear previous content
    canvas.innerHTML = '';
    
    // Create mermaid diagram div
    const diagramDiv = document.createElement('div');
    diagramDiv.className = 'mermaid';
    diagramDiv.textContent = workflow.diagram;
    
    canvas.appendChild(diagramDiv);
    
    // Initialize Mermaid for this diagram
    mermaid.contentLoaded();
}

function setupWorkflows() {
    const workflowBtns = document.querySelectorAll('.workflow-btn');
    workflowBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const workflowId = btn.dataset.workflow;
            workflowBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentWorkflow = workflowId;
            renderWorkflow(workflowId);
        });
    });
    
    // Render initial workflow
    renderWorkflow(currentWorkflow);
}

// Tab navigation
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const periodFilter = document.querySelector('.period-filter');
    
    console.warn('setupTabs(). Found buttons:', tabBtns.length, 'Found contents:', tabContents.length);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;
            console.log('Tab clicked:', tabId);
            
            // Update active button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${tabId}`) {
                    console.log('Activating:', content.id);
                    content.classList.add('active');
                }
            });
            
            // Show/hide period filter (only for Social tab)
            if (periodFilter) {
                periodFilter.style.display = tabId === 'social' ? 'flex' : 'none';
            }
        });
    });
}

// Initialize Mermaid
mermaid.initialize({ 
    startOnLoad: true,
    theme: 'dark',
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'linear'
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    setupPeriodFilters();
    setupTabs();
    setupWorkflows();
    fetchData();
    fetchProductivityData();
    fetchContentData();
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        refreshData();
        fetchProductivityData();
        fetchContentData();
    });
});