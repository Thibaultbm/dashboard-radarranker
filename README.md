# Dashboard Social - Instagram Stats

Dashboard web pour suivre les statistiques Instagram de @thibaultbessonmagdelain.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Démarrage du serveur
npm start
```

Le dashboard sera accessible sur http://localhost:3000

## 📁 Structure

```
dashboard-social/
├── server.js              # Serveur Express
├── package.json           # Dépendances
├── lib/
│   └── instagram-api.js   # Client API Instagram
├── scripts/
│   └── fetch-data.js      # Script de récupération autonome
├── data/
│   └── history.json       # Stockage local des données
└── public/
    ├── index.html         # Interface
    ├── style.css          # Styles
    └── app.js             # Application frontend
```

## 🔧 Configuration

Variables d'environnement :
- `INSTAGRAM_ACCESS_TOKEN` - Token d'accès API Instagram
- `INSTAGRAM_ACCOUNT_ID` - ID du compte (défaut: 17841450596082889)
- `PORT` - Port du serveur (défaut: 3000)
- `FETCH_TIME` - Cron pour la mise à jour auto (défaut: "0 9 * * *")

## 📊 Métriques suivies

- Followers / Following
- Impressions (24h)
- Reach (24h)
- Likes sur publications récentes
- Commentaires
- Saves
- Vues de profil

## ⏰ Mise à jour automatique

Le serveur planifie une mise à jour quotidienne à 9h (Europe/Paris).

Pour lancer manuellement :
```bash
npm run fetch
```

## 🔄 API Endpoints

- `GET /api/stats` - Tout l'historique
- `GET /api/stats/latest` - Dernières données
- `POST /api/fetch` - Déclencher une récupération

## 📝 Notes

- Les données sont stockées dans `data/history.json`
- Historique conservé: 365 jours maximum
- Les graphiques affichent les 30 derniers jours
