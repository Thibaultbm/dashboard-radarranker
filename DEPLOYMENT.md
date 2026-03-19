# Dashboard Social - Deployment & Startup Guide

## ✅ Configuration Status (2026-03-19)

### Services Configured
- **Dashboard Social**: Express.js server on port 3000
- **Cloudflared Tunnel**: Routes `https://dashboard.radarranker.com` → `http://localhost:3000`

### Files Created/Modified
- ✅ `.env` - Environment configuration with Instagram token
- ✅ `cloudflared-config/config.yml` - Tunnel routing config (port updated from 3456 → 3000)
- ✅ `dashboard-social.service` - Systemd service unit (for reference)
- ✅ `cloudflared-tunnel.service` - Systemd service unit (for reference)
- ✅ `/data/.openclaw/startup/00-dashboard-social.sh` - Auto-startup script
- ✅ `/data/.openclaw/startup/dashboard-social-supervisor.sh` - Crash recovery supervisor

## 🚀 Startup Methods

### Option 1: Manual Startup (Testing)
```bash
# Terminal 1: Start Dashboard
export PORT=3000
cd /data/.openclaw/workspace/dashboard-social
node server.js

# Terminal 2: Start Cloudflared Tunnel
cd /data/.openclaw/workspace/dashboard-social
/home/linuxbrew/.linuxbrew/bin/cloudflared tunnel run \
  --token eyJhIjoiOWQzYzQ4ZTY0NjgzZDc5OTY4N2ZjMzQxOTM4MTA5MTYiLCJ0IjoiZmM0ZDRiZjQtYzE1OS00NjIyLWEyZjMtMzg1M2YwNjBiYzBhIiwicyI6Ill6UmpZekUwWVRVdE9XVmtOaTAwT0RnMUxUbG1aV1V0WVdZNE16YzVOalkzTlRJdyJ9
```

### Option 2: Auto-Startup (on Container Boot)
The startup script is located at:
```
/data/.openclaw/startup/00-dashboard-social.sh
```

This script will:
1. Start Dashboard Social on port 3000
2. Wait 3 seconds for Dashboard to initialize
3. Start Cloudflared Tunnel with the configured token
4. Log output to `/var/log/dashboard-social.log` and `/var/log/cloudflared-tunnel.log`

### Option 3: Add to OpenClaw Cron
To schedule auto-startup with OpenClaw's cron system, create a heartbeat task:
```bash
# In HEARTBEAT.md or via OpenClaw scheduler
@boot /data/.openclaw/startup/00-dashboard-social.sh
```

## 📊 Monitoring & Logs

### Check Service Status
```bash
# Dashboard status
ps aux | grep "node server.js"

# Cloudflared tunnel status
ps aux | grep "cloudflared tunnel"

# Check logs
tail -f /var/log/dashboard-social.log
tail -f /var/log/cloudflared-tunnel.log
```

### Auto-Recovery (Supervisor)
The supervisor script at `/data/.openclaw/startup/dashboard-social-supervisor.sh` checks every 5 minutes if services are running and restarts them if needed.

Add to cron:
```bash
*/5 * * * * /data/.openclaw/startup/dashboard-social-supervisor.sh
```

## 🔐 HTTPS Access

### Current Setup
- **URL**: https://dashboard.radarranker.com/
- **Type**: Cloudflare Tunnel (automatic HTTPS)
- **Backend**: http://localhost:3000
- **Tunnel Status**: ✅ Tested & Working

### Verification
```bash
# Test tunnel connection
/home/linuxbrew/.linuxbrew/bin/cloudflared tunnel run \
  --token eyJhIjoiOWQzYzQ4ZTY0NjgzZDc5OTY4N2ZjMzQxOTM4MTA5MTYiLCJ0IjoiZmM0ZDRiZjQtYzE1OS00NjIyLWEyZjMtMzg1M2YwNjBiYzBhIiwicyI6Ill6UmpZekUwWVRVdE9XVmtOaTAwT0RnMUxUbG1aV1V0WVdZNE16YzVOalkzTlRJdyJ9

# After tunnel starts, access from another terminal:
curl -s https://dashboard.radarranker.com/ | head -20
```

## 🛠️ Environment Variables

File: `/data/.openclaw/workspace/dashboard-social/.env`

```bash
INSTAGRAM_ACCESS_TOKEN=EAAi767i6YdYBQ6JnTSxlUZALZBXtO5FW3eZCZCyNwRwsqnK2ZAwdkKsRYqAAB7JNZBOntOmI3l6wmtUiukkPXSidhQESHbTZCmn2mI9jEZCjCFXariC47C5GtvlDJZAUcObzPGK6kGrFUkG7hzCirbUkAvSla71ZCyNVdYYh8wZAE8E4PdmnKYy6YpgH7mZAZAj6nuEO6
INSTAGRAM_ACCOUNT_ID=17841450596082889
PORT=3000
FETCH_TIME=0 6 * * *
```

## 📝 Git Status

Latest commits:
- `db2033c` - Fix: posts-grid layout + content-grid-gallery multi-colonnes
- `d56f062` - Dashboard avec onglets

Branch: `main` (up to date with `origin/main`)

## ✨ Features Working

- ✅ Instagram data fetching with cron scheduling
- ✅ Multi-tab dashboard (Social, Productivité, Contenu)
- ✅ Responsive grid layouts
- ✅ Daily metrics tracking
- ✅ HTTPS via Cloudflare Tunnel

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Cloudflared Tunnel Not Connecting
Check credentials/token validity:
```bash
/home/linuxbrew/.linuxbrew/bin/cloudflared tunnel info
```

### Instagram API Token Expired
Update in `.env` and restart:
```bash
grep INSTAGRAM_ACCESS_TOKEN /data/.openclaw/openclaw.json | cut -d'"' -f4
```

---

**Last Updated**: 2026-03-19 19:52 UTC+1
**Status**: 🟢 All systems operational and verified
