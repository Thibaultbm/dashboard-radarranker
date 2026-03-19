#!/bin/bash

# Installation du cron pour mise à jour quotidienne
# Usage: ./install-cron.sh

DASHBOARD_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$DASHBOARD_DIR/data/cron.log"

# Créer le script de fetch
FETCH_SCRIPT="$DASHBOARD_DIR/scripts/fetch-cron.sh"

cat > "$FETCH_SCRIPT" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
export INSTAGRAM_ACCESS_TOKEN="${INSTAGRAM_ACCESS_TOKEN}"
node scripts/fetch-data.js >> data/cron.log 2>&1
EOF

chmod +x "$FETCH_SCRIPT"

# Ajouter au crontab (9h du matin tous les jours)
CRON_JOB="0 9 * * * $FETCH_SCRIPT"

# Vérifier si déjà présent
if crontab -l 2>/dev/null | grep -q "$FETCH_SCRIPT"; then
    echo "✅ Le cron est déjà configuré"
else
    # Ajouter au crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron installé: mise à jour quotidienne à 9h"
    echo "📋 Job: $CRON_JOB"
fi

echo ""
echo "Pour vérifier: crontab -l"
echo "Pour supprimer: crontab -e (puis supprimer la ligne)"
