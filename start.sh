#!/bin/bash

# Script de démarrage du Dashboard Social

cd "$(dirname "$0")"

# Vérifier que le token est configuré
if [ -z "$INSTAGRAM_ACCESS_TOKEN" ]; then
    echo "❌ Erreur: INSTAGRAM_ACCESS_TOKEN non configuré"
    echo "Exportez la variable d'environnement avant de lancer:"
    echo "export INSTAGRAM_ACCESS_TOKEN='votre_token'"
    exit 1
fi

# Port par défaut
PORT=${PORT:-3000}

echo "🚀 Démarrage du Dashboard Social..."
echo "📊 URL: http://localhost:$PORT"
echo "⏹️  Arrêter: Ctrl+C"
echo ""

node server.js
