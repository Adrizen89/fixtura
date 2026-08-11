import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { ErrorEvent } from '@sentry/node'

/**
 * Suivi des erreurs serveur (issue #118, cf. CLAUDE.md §10, §11).
 *
 * Abstraction fine, **activée par `SENTRY_DSN`** : sans DSN (dev, CI, prod sans
 * configuration), le suivi est **inerte** — `@sentry/node` n'est même pas chargé
 * (import dynamique) et **aucune donnée n'est envoyée à un tiers** (RGPD, §10). Le
 * jour où l'on renseigne `SENTRY_DSN` (VPS, géré par Adrien), les erreurs serveur
 * remontent à Sentry, en capture **minimale** : pas de tracing, pas
 * d'auto-instrumentation, et un filtre `scrubEvent` retire toute donnée
 * potentiellement personnelle avant envoi.
 */

let captureFn: ((error: unknown, hint?: { extra?: Record<string, unknown> }) => void) | null = null

/**
 * Filtre RGPD (§10) appliqué avant tout envoi : retire les données potentiellement
 * personnelles (cookies, en-têtes, corps et chaîne de requête, utilisateur). Pur →
 * testable indépendamment du SDK.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    delete event.request.data
    delete event.request.query_string
  }
  delete event.user
  return event
}

/**
 * Initialise le suivi si `SENTRY_DSN` est présent. Idempotent et sûr : sans DSN,
 * ne charge rien et ne fait rien. À appeler une fois au démarrage.
 */
export async function initErrorReporting(): Promise<void> {
  const dsn = env.get('SENTRY_DSN')
  if (!dsn || captureFn) return

  const Sentry = await import('@sentry/node')
  Sentry.init({
    dsn,
    environment: env.get('NODE_ENV'),
    tracesSampleRate: 0, // capture d'erreurs uniquement — pas de tracing
    sendDefaultPii: false, // jamais d'IP / cookies / utilisateur (§10)
    defaultIntegrations: false, // capture minimale, aucune auto-instrumentation
    beforeSend: scrubEvent,
  })
  captureFn = (error, hint) => Sentry.captureException(error, hint)
  logger.info('Suivi des erreurs Sentry activé.')
}

/**
 * Remonte une erreur au suivi si actif ; sinon **no-op** (les erreurs restent de
 * toute façon journalisées par le handler Adonis). `context` = métadonnées non
 * personnelles (méthode, URL…).
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  captureFn?.(error, context ? { extra: context } : undefined)
}

/** Indique si le suivi Sentry est actif (tests / diagnostics). */
export function isErrorReportingActive(): boolean {
  return captureFn !== null
}
