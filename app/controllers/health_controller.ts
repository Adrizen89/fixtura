import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { isErrorReportingActive } from '#services/error_reporter'

/**
 * État de santé de l'application (issue #118, cf. CLAUDE.md §11).
 *
 * Deux endpoints **publics, sans auth, sans donnée personnelle** :
 *
 * - `GET /up` — **liveness** : le process répond-il ? Réponse 200 minimale, sans
 *   toucher la base. C'est la sonde du reverse proxy / du script de déploiement
 *   (« l'app a-t-elle bien redémarré ? », cf. `.github/workflows/deploy.yml`).
 * - `GET /health` — **readiness** : diagnostic plus complet (connexion base,
 *   uptime, mémoire, environnement, version Node). Renvoie **503** si une
 *   dépendance critique est en panne (base injoignable), 200 sinon. Utile au
 *   monitoring / à un check manuel.
 *
 * Contrôleur mince (§8), aucune fuite : ni identifiants, ni contenu métier, ni
 * secret — seulement des métriques d'exploitation.
 */
export default class HealthController {
  /**
   * Liveness : le serveur HTTP tourne. Volontairement trivial et sans I/O pour
   * rester fiable même quand la base est en difficulté.
   */
  up({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }

  /**
   * Readiness : vérifie les dépendances critiques (base) et expose des métriques
   * de base. 503 si la base est injoignable.
   */
  async health({ response }: HttpContext) {
    let database: 'ok' | 'down' = 'ok'
    try {
      await db.rawQuery('select 1')
    } catch {
      database = 'down'
    }

    const memory = process.memoryUsage()
    const payload = {
      status: database === 'ok' ? ('ok' as const) : ('degraded' as const),
      environment: env.get('NODE_ENV'),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      checks: {
        database,
      },
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      },
      errorReporting: isErrorReportingActive() ? ('active' as const) : ('disabled' as const),
    }

    return response.status(database === 'ok' ? 200 : 503).json(payload)
  }
}
