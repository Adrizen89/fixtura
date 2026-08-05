import { defineConfig } from '@adonisjs/transmit'

/**
 * Configuration du temps réel (SSE) — cf. CLAUDE.md §4, §9.
 *
 * Transport en mémoire (`transport: null`) : suffisant pour la v1 qui tourne en
 * **instance unique** sur le VPS (PM2 mode fork). Un fan-out multi-instances
 * nécessiterait un transport Redis — non requis en v1.
 *
 * `pingInterval` : un ping périodique maintient la connexion SSE ouverte derrière
 * le reverse proxy nginx (évite la coupure sur `proxy_read_timeout`). Le client
 * `@adonisjs/transmit-client` se reconnecte tout seul, mais le ping réduit les
 * reconnexions inutiles.
 */
export default defineConfig({
  pingInterval: '30s',
  transport: null,
})
