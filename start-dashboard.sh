#!/bin/bash
# Startup script for dashboard-social

# Wait for system to be ready
sleep 5

# Set environment
export PORT=3000
export INSTAGRAM_ACCESS_TOKEN="EAAi767i6YdYBQ6JnTSxlUZALZBXtO5FW3eZCZCyNwRwsqnK2ZAwdkKsRYqAAB7JNZBOntOmI3l6wmtUiukkPXSidhQESHbTZCmn2mI9jEZCjCFXariC47C5GtvlDJZAUcObzPGK6kGrFUkG7hzCirbUkAvSla71ZCyNVdYYh8wZAE8E4PdmnKYy6YpgH7mZAZAj6nuEO6"
export FETCH_TIME="0 6 * * *"

# Start the dashboard
cd /data/.openclaw/workspace/dashboard-social
exec sudo -u node node server.js >> /var/log/dashboard-social.log 2>&1
