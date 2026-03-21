# Dashboard Social - Deployment Runbook

## ⚠️ Critical Issue: 502 on Code Updates

**Every time code is pushed to main, the dashboard Node.js process MUST be restarted on the VPS host.**

### The Problem
1. Code is pushed to GitHub
2. Dashboard still runs OLD code from before push
3. Cloudflare tunnel tries to reach localhost:3000
4. Process may crash due to environment issues
5. Result: HTTP 502 Bad Gateway

### Fix Procedure (After Each Git Push)

```bash
# On VPS host (31.97.53.158)
ssh root@31.97.53.158

# Kill existing process
pkill -9 -f "node.*server.js"
sleep 2

# Restart dashboard
cd /opt/dashboard-social
nohup node server.js > /var/log/dashboard.log 2>&1 &
sleep 3

# Verify
curl -s http://localhost:3000/ | head -1
```

### Automated Solution (TODO)
- [ ] Add Git webhook to trigger restart on push
- [ ] Create systemd service with auto-restart on crash
- [ ] Or: use PM2 process manager with watch mode

### Current Setup
- **Repo:** `/opt/dashboard-social` (VPS host)
- **Port:** 3000 (localhost)
- **Tunnel:** Cloudflare tunnel pointing to http://localhost:3000
- **Process:** Node.js running server.js
- **Config:** INSTAGRAM_ACCESS_TOKEN from /data/.openclaw/openclaw.json

### Testing Post-Deploy
```bash
# Check process is running
ps aux | grep "node.*server.js"

# Check port is listening
netstat -tlnp | grep 3000

# Test locally
curl http://localhost:3000/ | head -1

# Test via HTTPS (Cloudflare)
curl -I https://dashboard.radarranker.com/
```

**Expected:** HTTP/2 200 (not 502)
