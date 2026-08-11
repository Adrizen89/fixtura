import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Observabilité (issue #118, cf. CLAUDE.md §10, §11).
 *
 * Initialise le suivi des erreurs serveur **au démarrage**, une seule fois. Toute la
 * logique (et la garde `SENTRY_DSN`) vit dans `app/services/error_reporter.ts` :
 * sans DSN, `initErrorReporting` ne charge rien et ne fait rien — le provider reste
 * donc parfaitement inerte en dev / CI / prod sans configuration (RGPD, §10).
 */
export default class ObservabilityProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Application prête : on active le suivi des erreurs si `SENTRY_DSN` est présent.
   */
  async ready() {
    const { initErrorReporting } = await import('#services/error_reporter')
    await initErrorReporting()
  }
}
