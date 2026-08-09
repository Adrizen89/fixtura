import { test } from '@japa/runner'
import {
  registrationStatusFor,
  remainingSlots,
  generateRegistrationToken,
} from '#services/team_registration'
import { hitRateLimit, resetRateLimits } from '#services/rate_limit'

test.group('team_registration · statut du formulaire', () => {
  test('fermé quand l’orga n’a pas ouvert les inscriptions', ({ assert }) => {
    assert.equal(
      registrationStatusFor({ registrationOpen: false, registrationCapacity: 8 }, 0),
      'closed'
    )
  })

  test('ouvert sans capacité (illimité)', ({ assert }) => {
    assert.equal(
      registrationStatusFor({ registrationOpen: true, registrationCapacity: null }, 999),
      'open'
    )
  })

  test('ouvert tant que la capacité n’est pas atteinte', ({ assert }) => {
    assert.equal(
      registrationStatusFor({ registrationOpen: true, registrationCapacity: 8 }, 7),
      'open'
    )
  })

  test('complet quand la capacité est atteinte → fermeture auto', ({ assert }) => {
    assert.equal(
      registrationStatusFor({ registrationOpen: true, registrationCapacity: 8 }, 8),
      'full'
    )
    // Robustesse : au-delà de la capacité (équipes ajoutées à la main), reste « complet ».
    assert.equal(
      registrationStatusFor({ registrationOpen: true, registrationCapacity: 8 }, 9),
      'full'
    )
  })
})

test.group('team_registration · places restantes', () => {
  test('null (non affichée) sans capacité', ({ assert }) => {
    assert.isNull(remainingSlots({ registrationCapacity: null }, 3))
  })

  test('décompte des places restantes', ({ assert }) => {
    assert.equal(remainingSlots({ registrationCapacity: 8 }, 3), 5)
  })

  test('jamais négatif', ({ assert }) => {
    assert.equal(remainingSlots({ registrationCapacity: 8 }, 12), 0)
  })
})

test.group('team_registration · jeton', () => {
  test('génère un jeton non devinable, URL-safe et unique', ({ assert }) => {
    const a = generateRegistrationToken()
    const b = generateRegistrationToken()
    assert.notEqual(a, b)
    assert.isAbove(a.length, 20)
    assert.match(a, /^[A-Za-z0-9_-]+$/) // base64url : pas de +, /, =
  })
})

test.group('rate_limit · fenêtre glissante', (group) => {
  group.each.setup(() => resetRateLimits())

  test('bloque au-delà du quota dans la fenêtre', ({ assert }) => {
    const opts = { max: 3, windowMs: 1000 }
    // 3 tentatives autorisées (retournent false), la 4e est bloquée (true).
    assert.isFalse(hitRateLimit('k', opts, 0))
    assert.isFalse(hitRateLimit('k', opts, 100))
    assert.isFalse(hitRateLimit('k', opts, 200))
    assert.isTrue(hitRateLimit('k', opts, 300))
  })

  test('réautorise une fois la fenêtre écoulée', ({ assert }) => {
    const opts = { max: 1, windowMs: 1000 }
    assert.isFalse(hitRateLimit('k', opts, 0)) // 1re OK
    assert.isTrue(hitRateLimit('k', opts, 500)) // 2e bloquée (même fenêtre)
    assert.isFalse(hitRateLimit('k', opts, 1500)) // fenêtre passée → de nouveau OK
  })

  test('clés indépendantes (IP/tournoi différents)', ({ assert }) => {
    const opts = { max: 1, windowMs: 1000 }
    assert.isFalse(hitRateLimit('a', opts, 0))
    assert.isFalse(hitRateLimit('b', opts, 0)) // clé distincte, pas impactée par « a »
    assert.isTrue(hitRateLimit('a', opts, 10)) // « a » déjà à son quota
  })
})
