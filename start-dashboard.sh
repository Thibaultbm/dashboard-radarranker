#!/bin/bash
# Startup script for dashboard-social

# Wait for system to be ready
sleep 5

# Set environment
export PORT=3000
export INSTAGRAM_ACCESS_TOKEN="${INSTAGRAM_ACCESS_TOKEN}"
export FETCH_TIME="0 6 * * *"

# Start the dashboard
cd /data/.openclaw/workspace/dashboard-social
exec sudo -u node node server.js >> /var/log/dashboard-social.log 2>&1
