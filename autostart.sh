#!/bin/bash
# Auto-start dashboard on container boot

# Check if dashboard is already running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "[$(date)] Starting dashboard-social..."
    cd /data/.openclaw/workspace/dashboard-social
    sudo -u node bash -c "PORT=3000 node server.js > /tmp/dashboard.log 2>&1 &"
    sleep 2
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "[$(date)] Dashboard started successfully on port 3000"
    else
        echo "[$(date)] Failed to start dashboard"
    fi
else
    echo "[$(date)] Dashboard already running"
fi
