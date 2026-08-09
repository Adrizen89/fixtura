import { test } from '@japa/runner'
import { hitRateLimit, resetRateLimits } from '#services/rate_limit'

/**
 * Limiteur de débit (issue #116) — fenêtre glissante en mémoire. Horloge injectée
 * (`now`) pour tester le comportement sans dépendre du temps réel.
 */
test.group('rate_limit · fenêtre glissante', (group) => {
  group.each.setup(() => resetRateLimits())

  test('autorise jusqu’à max, puis bloque', ({ assert }) => {
    const opts = { max: 3, windowMs: 1000 }
    assert.isFalse(hitRateLimit('k', opts, 1000)) // 1
    assert.isFalse(hitRateLimit('k', opts, 1000)) // 2
    assert.isFalse(hitRateLimit('k', opts, 1000)) // 3
    assert.isTrue(hitRateLimit('k', opts, 1000)) // 4 → bloqué
  })

  test('la fenêtre glisse : les tentatives trop anciennes libèrent des places', ({ assert }) => {
    const opts = { max: 2, windowMs: 1000 }
    assert.isFalse(hitRateLimit('k', opts, 0)) // hit @0
    assert.isFalse(hitRateLimit('k', opts, 500)) // hit @500
    assert.isTrue(hitRateLimit('k', opts, 900)) // 3ᵉ dans la fenêtre → bloqué
    // À t=1200, le hit @0 est sorti de la fenêtre (>1000 ms) → une place se libère.
    assert.isFalse(hitRateLimit('k', opts, 1200))
  })

  test('les clés sont indépendantes', ({ assert }) => {
    const opts = { max: 1, windowMs: 1000 }
    assert.isFalse(hitRateLimit('ip-a', opts, 0))
    assert.isFalse(hitRateLimit('ip-b', opts, 0)) // autre clé → quota propre
    assert.isTrue(hitRateLimit('ip-a', opts, 0)) // ip-a déjà à sa limite
  })

  test('resetRateLimits repart de zéro', ({ assert }) => {
    const opts = { max: 1, windowMs: 1000 }
    assert.isFalse(hitRateLimit('k', opts, 0))
    assert.isTrue(hitRateLimit('k', opts, 0))
    resetRateLimits()
    assert.isFalse(hitRateLimit('k', opts, 0))
  })
})
