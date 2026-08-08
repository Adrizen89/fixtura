import { test } from '@japa/runner'
import {
  FORFEIT_WIN_SCORE,
  FORFEIT_LOSS_SCORE,
  forfeitFields,
  scoreFields,
  forfeitSideOf,
  timeToMinutes,
  scoreResult,
  stageAllowsDraw,
  shootoutSideOf,
  DrawNotAllowedError,
} from '#services/match_incidents'
import { computeStandings } from '#services/standings'

test.group('match_incidents · forfeitFields', () => {
  test('forfait domicile : l’extérieur gagne 3–0', ({ assert }) => {
    const fields = forfeitFields('home', 10, 20)

    assert.deepEqual(fields, {
      homeScore: FORFEIT_LOSS_SCORE,
      awayScore: FORFEIT_WIN_SCORE,
      status: 'forfeit',
      forfeitTeamId: 10,
    })
  })

  test('forfait extérieur : le domicile gagne 3–0', ({ assert }) => {
    const fields = forfeitFields('away', 10, 20)

    assert.deepEqual(fields, {
      homeScore: FORFEIT_WIN_SCORE,
      awayScore: FORFEIT_LOSS_SCORE,
      status: 'forfeit',
      forfeitTeamId: 20,
    })
  })
})

test.group('match_incidents · scoreFields', () => {
  test('un score saisi termine le match et annule tout forfait', ({ assert }) => {
    const fields = scoreFields(2, 1)

    assert.deepEqual(fields, {
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      forfeitTeamId: null,
    })
  })
})

test.group('match_incidents · forfeitSideOf', () => {
  test('déduit le côté forfaitaire', ({ assert }) => {
    assert.equal(forfeitSideOf('forfeit', 10, 10, 20), 'home')
    assert.equal(forfeitSideOf('forfeit', 20, 10, 20), 'away')
  })

  test('null hors forfait ou sans équipe forfaitaire', ({ assert }) => {
    assert.isNull(forfeitSideOf('finished', 10, 10, 20))
    assert.isNull(forfeitSideOf('forfeit', null, 10, 20))
    assert.isNull(forfeitSideOf('forfeit', 999, 10, 20))
  })
})

test.group('match_incidents · timeToMinutes', () => {
  test('convertit HH:mm en minutes', ({ assert }) => {
    assert.equal(timeToMinutes('00:00'), 0)
    assert.equal(timeToMinutes('09:30'), 570)
    assert.equal(timeToMinutes('23:59'), 1439)
  })

  test('rejette un format invalide', ({ assert }) => {
    assert.throws(() => timeToMinutes('24:00'))
    assert.throws(() => timeToMinutes('9:30'))
    assert.throws(() => timeToMinutes('midi'))
  })
})

test.group('match_incidents · impact classement du forfait', () => {
  test('un forfait matérialisé compte comme une victoire 3–0 au classement', ({ assert }) => {
    const teams = [
      { id: 10, name: 'Alpha' },
      { id: 20, name: 'Bravo' },
    ]
    // Bravo (extérieur) déclaré forfait → le score 3–0 pour Alpha est matérialisé
    // exactement comme le fera le contrôleur avant d'appeler computeStandings.
    const { homeScore, awayScore } = forfeitFields('away', 10, 20)
    const standings = computeStandings(teams, [
      { homeTeamId: 10, awayTeamId: 20, homeScore, awayScore },
    ])

    const alpha = standings.find((r) => r.teamId === 10)!
    const bravo = standings.find((r) => r.teamId === 20)!

    assert.equal(alpha.points, 3)
    assert.equal(alpha.won, 1)
    assert.equal(alpha.goalsFor, 3)
    assert.equal(alpha.goalsAgainst, 0)
    assert.equal(bravo.points, 0)
    assert.equal(bravo.lost, 1)
    assert.equal(bravo.played, 1)
  })
})

test.group('match_incidents · scoreResult (nul en élimination — #105)', () => {
  const KO = { stage: 'knockout', homeTeamId: 10, awayTeamId: 20 }
  const POOL = { stage: 'pool', homeTeamId: 10, awayTeamId: 20 }

  test('phases autorisant le nul : poule et championnat, pas l’élimination', ({ assert }) => {
    assert.isTrue(stageAllowsDraw('pool'))
    assert.isTrue(stageAllowsDraw('main'))
    assert.isFalse(stageAllowsDraw('knockout'))
  })

  test('score décisif : terminé, aucun vainqueur t.a.b.', ({ assert }) => {
    const fields = scoreResult({ ...KO, homeScore: 2, awayScore: 1 })
    assert.equal(fields.status, 'finished')
    assert.isNull(fields.shootoutWinnerTeamId)
  })

  test('nul en poule : autorisé, aucun vainqueur t.a.b.', ({ assert }) => {
    const fields = scoreResult({ ...POOL, homeScore: 1, awayScore: 1 })
    assert.equal(fields.status, 'finished')
    assert.isNull(fields.shootoutWinnerTeamId)
  })

  test('nul en élimination sans vainqueur désigné → DrawNotAllowedError', ({ assert }) => {
    assert.throws(() => scoreResult({ ...KO, homeScore: 1, awayScore: 1 }), DrawNotAllowedError)
    assert.throws(
      () => scoreResult({ ...KO, homeScore: 1, awayScore: 1, shootoutWinner: null }),
      DrawNotAllowedError
    )
  })

  test('nul en élimination avec vainqueur t.a.b. → équipe de ce côté', ({ assert }) => {
    const home = scoreResult({ ...KO, homeScore: 1, awayScore: 1, shootoutWinner: 'home' })
    assert.equal(home.shootoutWinnerTeamId, 10)
    const away = scoreResult({ ...KO, homeScore: 2, awayScore: 2, shootoutWinner: 'away' })
    assert.equal(away.shootoutWinnerTeamId, 20)
  })

  test('score décisif en élimination : le vainqueur t.a.b. transmis est ignoré', ({ assert }) => {
    const fields = scoreResult({ ...KO, homeScore: 3, awayScore: 1, shootoutWinner: 'away' })
    assert.isNull(fields.shootoutWinnerTeamId)
  })

  test('shootoutSideOf : déduit le côté du vainqueur t.a.b.', ({ assert }) => {
    assert.equal(shootoutSideOf(10, 10, 20), 'home')
    assert.equal(shootoutSideOf(20, 10, 20), 'away')
    assert.isNull(shootoutSideOf(null, 10, 20))
    assert.isNull(shootoutSideOf(99, 10, 20))
  })
})
