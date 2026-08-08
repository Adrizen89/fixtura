/**
 * Limiteur de débit **en mémoire** — anti-spam basique (issue #112).
 *
 * Fenêtre glissante par clé (typiquement l'IP + l'action). Pas de dépendance
 * externe : en v1 l'application tourne en instance unique (PM2 fork, cf. §11), un
 * store mémoire suffit. Le jour où l'on passe en cluster / multi-instances, il
 * faudra un store partagé (Redis) — l'API ci-dessous reste alors identique.
 *
 * Volontairement minimal (pas de package limiter) et **testable** : l'horloge est
 * injectable (`now`) pour vérifier le comportement sans dépendre du temps réel.
 */

interface Bucket {
  /** Timestamps (ms) des tentatives encore dans la fenêtre. */
  hits: number[]
}

export interface RateLimitOptions {
  /** Nombre maximum de tentatives autorisées dans la fenêtre. */
  max: number
  /** Durée de la fenêtre glissante, en millisecondes. */
  windowMs: number
}

/** Store module-level : partagé pour tout le process (instance unique). */
const buckets = new Map<string, Bucket>()

/**
 * Enregistre une tentative pour `key` et indique si la limite est **dépassée**.
 *
 * @returns `true` si la tentative doit être bloquée (quota dépassé), `false` sinon.
 */
export function hitRateLimit(
  key: string,
  options: RateLimitOptions,
  now: number = Date.now()
): boolean {
  const threshold = now - options.windowMs
  const bucket = buckets.get(key) ?? { hits: [] }

  // Purge les tentatives sorties de la fenêtre.
  bucket.hits = bucket.hits.filter((t) => t > threshold)

  if (bucket.hits.length >= options.max) {
    buckets.set(key, bucket)
    return true
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return false
}

/** Réinitialise tout le store (tests). */
export function resetRateLimits(): void {
  buckets.clear()
}
