# Fixtura

Plateforme web de gestion de tournois de football. À partir des paramètres d'un tournoi
(équipes, terrains, horaires), Fixtura **génère automatiquement un planning de matchs faisable**,
permet la **saisie des résultats à plusieurs le jour J**, calcule le **classement en direct**,
et le **diffuse aux équipes** via un affichage public (écran + lien mobile lecture seule).

Produit développé par **ADBDigital**. v1 mono-club, architecture prête pour l'ouverture multi-club.

## Stack

- [AdonisJS 6](https://adonisjs.com) (TypeScript) — backend MVC
- [Inertia](https://inertiajs.com) + [Vue 3](https://vuejs.org) — front (monolithe)
- [Lucid ORM](https://lucid.adonisjs.com) + PostgreSQL
- `@adonisjs/transmit` (SSE) — temps réel (classement / scores live)
- `@adonisjs/auth` (session) — authentification des organisateurs
- [Tailwind CSS](https://tailwindcss.com)

## Prérequis

- Node.js LTS ≥ 20
- PostgreSQL ≥ 14
- npm

## Installation

```bash
git clone <url-du-repo> fixtura
cd fixtura
npm install
cp .env.example .env   # renseigner la connexion Postgres + APP_KEY
node ace migration:run
node ace db:seed        # crée le club + un compte organisateur de départ
```

## Développement

```bash
npm run dev
```

L'application démarre sur `http://localhost:3333` (port par défaut Adonis, configurable via `.env`).

## Build (production)

```bash
node ace build
node ace migration:run --force
```

Sortie dans `build/`. Déploiement sur **Hostinger VPS** (Node + PostgreSQL + PM2 + nginx + SSL),
géré par ADBDigital.

## Structure

```
app/
  controllers/       # contrôleurs (minces)
  models/            # modèles Lucid (Club, User, Tournament, Team, Match)
  services/
    scheduler/       # génération du planning — TS pur, testé unitairement (cœur du projet)
  middleware/
  validators/        # VineJS
database/
  migrations/
  seeders/
inertia/
  pages/             # pages Vue (admin + écran public)
  app/
start/
  routes.ts
config/
tests/               # tests unitaires (scheduler, classement)
```

## Crédits

Développé par **ADBDigital** — [adri.veille.tech](mailto:adri.veille.tech@gmail.com).

## Licence

Propriétaire — © ADBDigital. Tous droits réservés.
