import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { hitRateLimit } from '#services/rate_limit'

/**
 * Middleware de limitation de débit (issue #116, cf. CLAUDE.md §10).
 *
 * Protège les endpoints sensibles / publics (login anti-bruteforce, écrans
 * publics, formulaires) contre les abus. S'appuie sur le limiteur **en mémoire**
 * partagé (`#services/rate_limit`, fenêtre glissante par IP — v1 instance unique,
 * cf. §11 ; un store Redis prendra le relais en cluster sans changer cette API).
 *
 * Au dépassement : **429 Too Many Requests** avec en-tête `Retry-After`, message
 * clair. Les limites sont volontairement **généreuses** pour ne jamais gêner un
 * usage légitime (un stade derrière une même IP, quelques tentatives de connexion).
 */
export interface ThrottleOptions {
  /** Nom du groupe de limite : des buckets indépendants par usage (login, public…). */
  name: string
  /** Nombre maximum de requêtes autorisées par IP dans la fenêtre. */
  max: number
  /** Durée de la fenêtre glissante, en millisecondes. */
  windowMs: number
}

export default class ThrottleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    // Clé = usage + IP : chaque endpoint a son quota, isolé par client.
    const key = `${options.name}:${ctx.request.ip()}`

    if (hitRateLimit(key, { max: options.max, windowMs: options.windowMs })) {
      ctx.response.header('Retry-After', String(Math.ceil(options.windowMs / 1000)))
      return ctx.response
        .status(429)
        .send('Trop de requêtes. Merci de patienter un instant avant de réessayer.')
    }

    return next()
  }
}
