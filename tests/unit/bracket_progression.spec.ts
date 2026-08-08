import { test } from '@japa/runner'
import { planProgression, outcomeOf } from '#services/bracket_progression'
import type { ProgressMatch } from '#services/bracket_progression'

const TEAMS = new Map([
  [1, 'A'],
  [2, 'B'],
  [3, 'C'],
  [4, 'D'],
  [5, 'E'],
])

/** Fabrique un `ProgressMatch` (valeurs par défaut « slot vide, non joué »). */
function m(p: Partial<ProgressMatch> & { id: number }): ProgressMatch {
  return {
    stage: 'knockout',
    groupLabel: null,
    status: 'scheduled',
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    shootoutWinnerTeamId: null,
    homeSourceType: null,
    homeSourceMatchId: null,
    homeSourcePool: null,
    homeSourceRank: null,
    awaySourceType: null,
    awaySourceMatchId: null,
    awaySourcePool: null,
    awaySourceRank: null,
    ...p,
  }
}

const winner = (src: number) =>
  ({ homeSourceType: 'match_winner', homeSourceMatchId: src }) as Partial<ProgressMatch>

test.group('progression · outcomeOf', () => {
  test('vainqueur / perdant d’un match réglé ; nul → aucun', ({ assert }) => {
    const won = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 3,
      awayScore: 1,
    })
    assert.deepEqual(outcomeOf(won), { winnerId: 1, loserId: 2 })

    const draw = m({
      id: 2,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 2,
      awayScore: 2,
    })
    assert.isNull(outcomeOf(draw))

    const notPlayed = m({ id: 3, status: 'scheduled', homeTeamId: 1, awayTeamId: 2 })
    assert.isNull(outcomeOf(notPlayed))
  })
})

test.group('progression · propagation vainqueur / forfait', () => {
  test('le vainqueur d’un match réglé remplit le slot aval ; un feeder non joué ne remplit rien', ({
    assert,
  }) => {
    const qf1 = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 2,
      awayScore: 1,
    })
    const qf2 = m({ id: 2, status: 'scheduled', homeTeamId: 3, awayTeamId: 4 })
    const sf = m({
      id: 3,
      homeSourceType: 'match_winner',
      homeSourceMatchId: 1,
      awaySourceType: 'match_winner',
      awaySourceMatchId: 2,
    })

    const { fills, conflict } = planProgression([qf1, qf2, sf], TEAMS)
    assert.isUndefined(conflict)
    assert.deepEqual(fills, [{ matchId: 3, side: 'home', teamId: 1 }])
  })

  test('le forfait propage le vainqueur (adversaire) vers l’aval', ({ assert }) => {
    const qf = m({
      id: 1,
      status: 'forfeit',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 3,
      awayScore: 0,
    })
    const sf = m({ id: 2, ...winner(1) })

    const { fills } = planProgression([qf, sf], TEAMS)
    assert.deepEqual(fills, [{ matchId: 2, side: 'home', teamId: 1 }])
  })

  test('perdant (petite finale) : le perdant de la demie remplit le slot', ({ assert }) => {
    const sf = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 3,
    })
    const third = m({ id: 2, homeSourceType: 'match_loser', homeSourceMatchId: 1 })

    const { fills } = planProgression([sf, third], TEAMS)
    assert.deepEqual(fills, [{ matchId: 2, side: 'home', teamId: 1 }])
  })
})

test.group('progression · seeding poules → bracket', () => {
  test('poule terminée : les slots pool_rank sont remplis selon le classement', ({ assert }) => {
    // Poule A (1,2,3) : 1 gagne tout, 2 deuxième, 3 dernier.
    const pool = [
      m({
        id: 1,
        stage: 'pool',
        groupLabel: 'A',
        status: 'finished',
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 2,
        awayScore: 0,
      }),
      m({
        id: 2,
        stage: 'pool',
        groupLabel: 'A',
        status: 'finished',
        homeTeamId: 1,
        awayTeamId: 3,
        homeScore: 2,
        awayScore: 0,
      }),
      m({
        id: 3,
        stage: 'pool',
        groupLabel: 'A',
        status: 'finished',
        homeTeamId: 2,
        awayTeamId: 3,
        homeScore: 1,
        awayScore: 0,
      }),
    ]
    const ko = m({
      id: 4,
      homeSourceType: 'pool_rank',
      homeSourcePool: 'A',
      homeSourceRank: 1,
      awaySourceType: 'pool_rank',
      awaySourcePool: 'A',
      awaySourceRank: 2,
    })

    const { fills } = planProgression([...pool, ko], TEAMS)
    assert.deepEqual(fills, [
      { matchId: 4, side: 'home', teamId: 1 },
      { matchId: 4, side: 'away', teamId: 2 },
    ])
  })

  test('poule non terminée : aucun qualifié n’est encore attribué', ({ assert }) => {
    const pool = [
      m({
        id: 1,
        stage: 'pool',
        groupLabel: 'A',
        status: 'finished',
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 2,
        awayScore: 0,
      }),
      m({
        id: 2,
        stage: 'pool',
        groupLabel: 'A',
        status: 'scheduled',
        homeTeamId: 1,
        awayTeamId: 3,
      }),
      m({
        id: 3,
        stage: 'pool',
        groupLabel: 'A',
        status: 'scheduled',
        homeTeamId: 2,
        awayTeamId: 3,
      }),
    ]
    const ko = m({ id: 4, homeSourceType: 'pool_rank', homeSourcePool: 'A', homeSourceRank: 1 })

    const { fills } = planProgression([...pool, ko], TEAMS)
    assert.lengthOf(fills, 0)
  })
})

test.group('progression · idempotence & correction', () => {
  test('idempotent : un slot déjà correct n’est pas ré-écrit', ({ assert }) => {
    const qf = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 2,
      awayScore: 1,
    })
    const sf = m({ id: 2, homeTeamId: 1, ...winner(1) }) // déjà rempli avec le vainqueur

    const { fills } = planProgression([qf, sf], TEAMS)
    assert.lengthOf(fills, 0)
  })

  test('correction en amont, aval PAS encore joué : le slot est re-résolu', ({ assert }) => {
    // qf1 corrigé → 2 gagne désormais ; sf porte encore l’ancien vainqueur 1, mais non joué.
    const qf1 = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 2,
    })
    const sf = m({ id: 2, status: 'scheduled', homeTeamId: 1, ...winner(1) })

    const { fills, conflict } = planProgression([qf1, sf], TEAMS)
    assert.isUndefined(conflict)
    assert.deepEqual(fills, [{ matchId: 2, side: 'home', teamId: 2 }])
  })

  test('correction en amont, aval DÉJÀ joué : conflit bloquant, aucun remplissage', ({
    assert,
  }) => {
    const qf1 = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 2,
    })
    const sf = m({
      id: 2,
      status: 'finished', // déjà joué avec l’ancien qualifié (1)
      homeTeamId: 1,
      awayTeamId: 5,
      homeScore: 1,
      awayScore: 0,
      ...winner(1),
    })

    const { fills, conflict } = planProgression([qf1, sf], TEAMS)
    assert.isDefined(conflict)
    assert.lengthOf(fills, 0)
  })
})

test.group('progression · tirs au but (nul en élimination — #105)', () => {
  test('outcomeOf : un nul départagé aux t.a.b. désigne un vainqueur', ({ assert }) => {
    const base = {
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 1,
      awayScore: 1,
    }
    // Sans vainqueur t.a.b. → pas d’issue.
    assert.isNull(outcomeOf(m({ ...base })))
    // Vainqueur t.a.b. côté domicile.
    assert.deepEqual(outcomeOf(m({ ...base, shootoutWinnerTeamId: 1 })), {
      winnerId: 1,
      loserId: 2,
    })
    // Vainqueur t.a.b. côté extérieur.
    assert.deepEqual(outcomeOf(m({ ...base, shootoutWinnerTeamId: 2 })), {
      winnerId: 2,
      loserId: 1,
    })
  })

  test('le vainqueur t.a.b. d’une demie nulle remplit la finale', ({ assert }) => {
    const sf = m({
      id: 1,
      status: 'finished',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 0,
      shootoutWinnerTeamId: 2, // B gagne aux t.a.b.
    })
    const final = m({ id: 2, ...winner(1) }) // finale = vainqueur de la demie #1

    const { fills, conflict } = planProgression([sf, final], TEAMS)
    assert.isUndefined(conflict)
    assert.deepEqual(fills, [{ matchId: 2, side: 'home', teamId: 2 }])
  })
})
