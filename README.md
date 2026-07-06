# Ma Compta

Suivi quotidien des revenus OnlyFans (commission 20% calculée automatiquement) et des dépenses, avec un bot Telegram pour tout enregistrer en envoyant un simple message.

## 1. Créer une base de données Postgres gratuite (Neon)

1. Va sur https://neon.tech et crée un compte gratuit.
2. Crée un nouveau projet.
3. Copie la **connection string** (elle ressemble à `postgresql://user:password@host/dbname?sslmode=require`).

## 2. Configurer le projet

Dans le fichier `.env` :

```
DATABASE_URL="<ta connection string Neon>"
TELEGRAM_BOT_TOKEN="<ton token @BotFather>"
TELEGRAM_WEBHOOK_SECRET="<déjà généré, ne pas changer>"
APP_TIMEZONE="America/Toronto"
```

## 3. Installer et créer les tables

```bash
npm install
npx prisma migrate dev --name init
```

## 4. Lancer en local

```bash
npm run dev
```

Ouvre http://localhost:3000

## 5. Déployer en ligne (Vercel)

1. Pousse ce projet sur GitHub.
2. Sur https://vercel.com, importe le repo.
3. Ajoute les variables d'environnement (`DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `APP_TIMEZONE`) dans les Project Settings.
4. Déploie.

## 6. Connecter le bot Telegram

Une fois déployé, visite (une seule fois) :

```
https://TON-SITE.vercel.app/api/telegram/setup?key=TELEGRAM_WEBHOOK_SECRET
```

(remplace `TELEGRAM_WEBHOOK_SECRET` par la vraie valeur). Ça enregistre automatiquement le webhook Telegram.

Envoie ensuite `/start` à ton bot : le premier message reçu lie définitivement le bot à ton compte Telegram (personne d'autre ne pourra l'utiliser).

## Utilisation du bot

- `onlyfans 1655` → revenu, commission de 20% déduite automatiquement
- `of 1655` → équivalent
- `topup 600` → dépense
- `depense essence 40` → dépense avec note
- `revenu 100` → revenu sans commission (autre source)
