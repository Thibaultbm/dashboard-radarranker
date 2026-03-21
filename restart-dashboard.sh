#!/bin/bash
# Restart Dashboard Social after code updates

echo "🔄 Restarting Dashboard Social..."

# Kill existing process
pkill -9 -f "node.*server.js"
sleep 2

# Start dashboard
cd /opt/dashboard-social
export PORT=3000
nohup node server.js > /var/log/dashboard.log 2>&1 &
DASHBOARD_PID=$!

echo "✓ Dashboard PID: $DASHBOARD_PID"

# Wait for startup
sleep 3

# Verify it's running
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo "✓ Dashboard is responding on localhost:3000"
    echo "✓ Cloudflare tunnel should now work"
    exit 0
else
    echo "✗ Dashboard failed to start - check /var/log/dashboard.log"
    tail -20 /var/log/dashboard.log
    exit 1
fi
