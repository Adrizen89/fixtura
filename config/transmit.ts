import env from '#start/env'
import { defineConfig } from '@adonisjs/transmit'
import { redis } from '@adonisjs/transmit/transports/redis'

/**
 * Configuration du temps réel (SSE) — cf. CLAUDE.md §4, §9, §11.
 *
 * Transport :
 * - **En mémoire** (`transport: null`) par défaut. Suffisant pour la v1 qui
 *   tourne en **instance unique** sur le VPS (PM2 mode fork). Aucun service
 *   externe requis : c'est le repli propre en dev et en prod mono-instance.
 * - **Redis** dès que `REDIS_HOST` est défini. Nécessaire pour faire du
 *   **fan-out multi-instances** : sans transport partagé, un broadcast émis par
 *   une instance PM2 n'atteint pas les abonnés SSE des autres instances. C'est
 *   le **prérequis de scaling** (multi-club, PM2 cluster — cf. CLAUDE.md §11 et
 *   `ecosystem.config.cjs`).
 *
 * Redis reste **optionnel en local** : ne pas renseigner `REDIS_HOST` laisse le
 * transport en mémoire, sans dépendance à un serveur Redis lancé.
 *
 * `pingInterval` : un ping périodique maintient la connexion SSE ouverte derrière
 * le reverse proxy nginx (évite la coupure sur `proxy_read_timeout`). Le client
 * `@adonisjs/transmit-client` se reconnecte tout seul, mais le ping réduit les
 * reconnexions inutiles.
 */
const redisHost = env.get('REDIS_HOST')

export default defineConfig({
  pingInterval: '30s',
  transport: redisHost
    ? {
        driver: redis({
          host: redisHost,
          port: env.get('REDIS_PORT'),
          password: env.get('REDIS_PASSWORD'),
        }),
      }
    : null,
})
