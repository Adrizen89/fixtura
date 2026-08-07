/**
 * PM2 — Fixtura (production)
 *
 * Résumé : `node ace build` génère le dossier `build/`. On y place le `.env` de
 * prod (cf. .env.production.example), on installe les deps de prod
 * (`npm ci --omit=dev` dans build/), puis `pm2 start ecosystem.config.cjs`
 * depuis la racine du projet.
 *
 * Nombre d'instances / mode d'exécution :
 * - **Par défaut : UNE instance (mode fork).** Suffit largement pour un club.
 *   @adonisjs/transmit garde alors les abonnements SSE en mémoire par process,
 *   ce qui est parfait tant qu'il n'y a qu'un process.
 * - **Cluster (plusieurs instances) : possible, mais SEULEMENT avec le transport
 *   Redis de transmit activé** (`REDIS_HOST` défini dans build/.env — cf.
 *   config/transmit.ts et CLAUDE.md §11). Sans transport partagé, un broadcast
 *   émis par une instance n'atteint pas les abonnés SSE des autres → diffusion
 *   perdue. Avec Redis, le fan-out inter-instances est assuré.
 *
 * Pour passer en cluster, définir `PM2_INSTANCES` (nombre, ou `max` pour tous
 * les cœurs) dans l'environnement au démarrage de PM2, p. ex. :
 *   PM2_INSTANCES=max pm2 start ecosystem.config.cjs
 * `exec_mode` bascule alors automatiquement en `cluster`.
 */
const rawInstances = process.env.PM2_INSTANCES ?? '1'
const clusterMode = rawInstances !== '1'
const instances = rawInstances === 'max' ? 'max' : Number(rawInstances)

module.exports = {
  apps: [
    {
      name: 'fixtura',
      cwd: './build',
      script: './bin/server.js',
      instances: clusterMode ? instances : 1,
      exec_mode: clusterMode ? 'cluster' : 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
