import { test } from '@japa/runner'
import {
  diffFollowedTeam,
  hasFinishedAll,
  nextMatchFor,
  type FollowMatch,
} from '../../inertia/composables/next_match.js'

/**
 * Logique pure du suivi d'équipe sur l'écran public (issue #39). Testée isolément,
 * sans Vue ni DOM : prochain match + détection des changements (décalage, terrain,
 * forfait adverse, slot résolu).
 */

/** Fabrique un match avec des valeurs par défaut raisonnables. */
function match(over: Partial<FollowMatch> & { id: number }): FollowMatch {
  return {
    time: '09:00',
    terrainNumber: 1,
    status: 'scheduled',
    forfeitSide: null,
    homeTeamId: 1,
    awayTeamId: 2,
    homeTeam: 'Alpha',
    awayTeam: 'Bravo',
    ...over,
  }
}

test.group('next_match — prochain match', () => {
  test('retourne le match à venir le plus tôt impliquant l’équipe', ({ assert }) => {
    const matches = [
      match({ id: 1, time: '10:00', homeTeamId: 1, awayTeamId: 3 }),
      match({ id: 2, time: '09:00', homeTeamId: 4, awayTeamId: 1 }),
      match({ id: 3, time: '09:30', homeTeamId: 2, awayTeamId: 3 }), // sans l'équipe 1
    ]
    const next = nextMatchFor(matches, 1)
    assert.equal(next?.id, 2)
  })

  test('ignore les matchs terminés / forfait', ({ assert }) => {
    const matches = [
      match({ id: 1, time: '09:00', status: 'finished', homeTeamId: 1, awayTeamId: 2 }),
      match({ id: 2, time: '11:00', status: 'scheduled', homeTeamId: 1, awayTeamId: 3 }),
    ]
    assert.equal(nextMatchFor(matches, 1)?.id, 2)
  })

  test('retourne null si plus aucun match à venir', ({ assert }) => {
    const matches = [match({ id: 1, status: 'finished', homeTeamId: 1, awayTeamId: 2 })]
    assert.isNull(nextMatchFor(matches, 1))
    assert.isTrue(hasFinishedAll(matches, 1))
  })

  test('hasFinishedAll est faux si aucun match connu', ({ assert }) => {
    assert.isFalse(hasFinishedAll([match({ id: 1, homeTeamId: 5, awayTeamId: 6 })], 1))
  })
})

test.group('next_match — détection des changements', () => {
  test('signale un décalage horaire du prochain match', ({ assert }) => {
    const prev = [match({ id: 1, time: '09:00', homeTeamId: 1, awayTeamId: 2 })]
    const next = [match({ id: 1, time: '09:30', homeTeamId: 1, awayTeamId: 2 })]
    const alerts = diffFollowedTeam(prev, next, 1)
    assert.lengthOf(alerts, 1)
    assert.equal(alerts[0].kind, 'rescheduled')
    assert.include(alerts[0].message, '09:30')
  })

  test('signale un changement de terrain (heure inchangée)', ({ assert }) => {
    const prev = [match({ id: 1, terrainNumber: 1, homeTeamId: 1, awayTeamId: 2 })]
    const next = [match({ id: 1, terrainNumber: 3, homeTeamId: 1, awayTeamId: 2 })]
    const alerts = diffFollowedTeam(prev, next, 1)
    assert.lengthOf(alerts, 1)
    assert.equal(alerts[0].kind, 'terrain')
    assert.include(alerts[0].message, 'Terrain 3')
  })

  test('signale un forfait adverse (l’équipe suivie l’emporte)', ({ assert }) => {
    const prev = [match({ id: 1, status: 'scheduled', homeTeamId: 1, awayTeamId: 2 })]
    // L'adversaire (côté away) déclare forfait → forfeitSide = 'away'.
    const next = [
      match({ id: 1, status: 'forfeit', forfeitSide: 'away', homeTeamId: 1, awayTeamId: 2 }),
    ]
    const alerts = diffFollowedTeam(prev, next, 1)
    assert.lengthOf(alerts, 1)
    assert.equal(alerts[0].kind, 'opponent_forfeit')
    assert.include(alerts[0].message, 'Bravo')
  })

  test('ne signale PAS son propre forfait', ({ assert }) => {
    const prev = [match({ id: 1, status: 'scheduled', homeTeamId: 1, awayTeamId: 2 })]
    // L'équipe suivie (côté home) déclare forfait → forfeitSide = 'home'.
    const next = [
      match({ id: 1, status: 'forfeit', forfeitSide: 'home', homeTeamId: 1, awayTeamId: 2 }),
    ]
    assert.lengthOf(diffFollowedTeam(prev, next, 1), 0)
  })

  test('ignore les changements des autres équipes', ({ assert }) => {
    const prev = [match({ id: 9, time: '10:00', homeTeamId: 3, awayTeamId: 4 })]
    const next = [match({ id: 9, time: '11:00', homeTeamId: 3, awayTeamId: 4 })]
    assert.lengthOf(diffFollowedTeam(prev, next, 1), 0)
  })

  test('signale un nouveau match quand un slot différé se résout vers l’équipe', ({ assert }) => {
    // Avant : le slot n'était pas encore attribué à l'équipe 1.
    const prev = [
      match({ id: 5, homeTeamId: null, awayTeamId: null, homeTeam: 'Vainqueur Demie #1' }),
    ]
    const next = [match({ id: 5, homeTeamId: 1, awayTeamId: 7, awayTeam: 'Zeta' })]
    const alerts = diffFollowedTeam(prev, next, 1)
    assert.lengthOf(alerts, 1)
    assert.equal(alerts[0].kind, 'new_match')
    assert.include(alerts[0].message, 'Zeta')
  })

  test('un score saisi sur le match à venir ne génère pas de fausse alerte', ({ assert }) => {
    const prev = [match({ id: 1, status: 'scheduled', homeTeamId: 1, awayTeamId: 2 })]
    const next = [match({ id: 1, status: 'finished', homeTeamId: 1, awayTeamId: 2 })]
    assert.lengthOf(diffFollowedTeam(prev, next, 1), 0)
  })
})
