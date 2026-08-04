/**
 * PM2 — Fixtura (production)
 *
 * Résumé : `node ace build` génère le dossier `build/`. On y place le `.env` de
 * prod (cf. .env.production.example), on installe les deps de prod
 * (`npm ci --omit=dev` dans build/), puis `pm2 start ecosystem.config.cjs`
 * depuis la racine du projet.
 *
 * UNE SEULE instance (mode fork) : @adonisjs/transmit garde les abonnements SSE
 * en mémoire par process. En cluster, les broadcasts ne seraient pas diffusés
 * aux clients des autres instances (sauf transport Redis). Un club = une
 * instance suffit largement.
 */
module.exports = {
  apps: [
    {
      name: 'fixtura',
      cwd: './build',
      script: './bin/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
