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
- PostgreSQL ≥ 14 — ou **Docker** pour la lancer sans rien installer (cf. « Démarrage rapide » ci-dessous)
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

## Démarrage rapide (Docker)

Le plus simple pour lancer l'application en local : **PostgreSQL via Docker**, l'app en
`npm` sur la machine hôte (le HMR Vite fonctionne nativement). Un `docker-compose.yml`
fournit une base déjà alignée sur `.env.example` — aucune variable de connexion à modifier.

```bash
docker compose up -d        # 1) PostgreSQL (prêt en ~3 s, sans mot de passe en dev)
npm install                 # 2) dépendances (Node ≥ 20)
cp .env.example .env        # 3) config (déjà alignée sur le conteneur)
node ace generate:key       #    → renseigne APP_KEY dans .env
node ace migration:run      # 4) tables
node ace db:seed            #    → club « Club Démo » + compte organisateur
node ace serve --hmr        # 5) → http://localhost:3333
```

Connexion de démo : **`owner@fixtura.test`** / **`password`**. Bascule FR/EN via le
sélecteur en pied de page.

Pour tout arrêter : `docker compose down` (ajouter `-v` pour supprimer aussi les données).

> ⚠️ Le `docker-compose.yml` utilise l'auth `trust` (sans mot de passe) — **dev local
> uniquement**, jamais en production.
>
> Note : `node ace test` réutilise la base de dev et la **vide** (truncate) entre les
> tests ; relancez `node ace db:seed` ensuite pour retrouver le compte de démo.

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
