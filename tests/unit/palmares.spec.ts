import { test } from '@japa/runner'
import { computePalmares, editionResult } from '#services/palmares'
import type { PalmaresMatchInput, PalmaresTournamentInput } from '#services/palmares'

function team(id: number, name: string) {
  return { id, name }
}

/** Match de championnat (stage 'main'), tranché. */
function main(
  homeTeamId: number,
  homeScore: number,
  awayScore: number,
  awayTeamId: number
): PalmaresMatchInput {
  return {
    stage: 'main',
    bracketRound: null,
    status: 'finished',
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
  }
}

/** Match de tableau (stage 'knockout') avec son tour. */
function ko(
  bracketRound: string,
  homeTeamId: number | null,
  homeScore: number | null,
  awayScore: number | null,
  awayTeamId: number | null,
  status = 'finished'
): PalmaresMatchInput {
  return { stage: 'knockout', bracketRound, status, homeTeamId, awayTeamId, homeScore, awayScore }
}

function tournament(over: Partial<PalmaresTournamentInput> = {}): PalmaresTournamentInput {
  return {
    id: 1,
    name: 'Tournoi',
    category: 'U11',
    eventDate: '2026-06-01',
    format: 'championship',
    teams: [],
    matches: [],
    ...over,
  }
}

test.group('palmares · vainqueur par édition', () => {
  test('championnat : le 1er du classement gagne, le 2e est finaliste', ({ assert }) => {
    const edition = editionResult(
      tournament({
        teams: [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie')],
        matches: [
          main(1, 3, 0, 2), // Alpha bat Bravo
          main(1, 3, 0, 3), // Alpha bat Charlie
          main(2, 1, 0, 3), // Bravo bat Charlie
        ],
      })
    )

    assert.equal(edition.winner?.teamName, 'Alpha') // 6 pts
    assert.equal(edition.finalist?.teamName, 'Bravo') // 3 pts
  })

  test('élimination directe : la finale tranche, pas le classement', ({ assert }) => {
    // Charlie a le meilleur bilan brut (2 victoires en amont) mais perd la finale :
    // le vainqueur du tournoi est celui qui gagne la finale.
    const edition = editionResult(
      tournament({
        format: 'knockout',
        teams: [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie'), team(4, 'Delta')],
        matches: [
          ko('sf', 1, 1, 0, 4), // demi : Alpha bat Delta
          ko('sf', 3, 5, 0, 2), // demi : Charlie écrase Bravo
          ko('final', 1, 2, 1, 3), // finale : Alpha bat Charlie
          ko('third', 4, 3, 0, 2), // petite finale : Delta 3e
        ],
      })
    )

    assert.equal(edition.winner?.teamName, 'Alpha') // vainqueur de la finale
    assert.equal(edition.finalist?.teamName, 'Charlie') // perdant de la finale
  })

  test('hybride : la finale de tableau prime sur les classements de poule', ({ assert }) => {
    const edition = editionResult(
      tournament({
        format: 'hybrid',
        teams: [team(1, 'Alpha'), team(2, 'Bravo'), team(3, 'Charlie'), team(4, 'Delta')],
        matches: [
          { ...main(1, 3, 0, 2), stage: 'pool', bracketRound: null },
          { ...main(3, 3, 0, 4), stage: 'pool', bracketRound: null },
          ko('final', 2, 2, 1, 3), // Bravo (2e de poule) gagne la finale
        ],
      })
    )

    assert.equal(edition.winner?.teamName, 'Bravo')
    assert.equal(edition.finalist?.teamName, 'Charlie')
  })

  test('le barème du tournoi influe sur le vainqueur du championnat (#104)', ({ assert }) => {
    const teams = [team(1, 'Gagneur'), team(2, 'Nuleur'), team(3, 'C'), team(4, 'D')]
    const matches = [
      main(1, 1, 0, 3), // Gagneur bat C
      { ...main(2, 0, 0, 3) }, // Nuleur ~ C : nul
      { ...main(2, 0, 0, 4) }, // Nuleur ~ D : nul
    ]
    // Barème 1/1/0 : deux nuls (2 pts) passent devant une victoire (1 pt).
    const flat = editionResult(
      tournament({ teams, matches, scoring: { win: 1, draw: 1, loss: 0 } })
    )
    assert.equal(flat.winner?.teamName, 'Nuleur')

    // Barème par défaut 3/1/0 : la victoire (3 pts) l'emporte.
    const standard = editionResult(tournament({ teams, matches }))
    assert.equal(standard.winner?.teamName, 'Gagneur')
  })

  test('sans match joué, pas de vainqueur', ({ assert }) => {
    const edition = editionResult(
      tournament({ teams: [team(1, 'Alpha'), team(2, 'Bravo')], matches: [] })
    )
    assert.isNull(edition.winner)
    assert.isNull(edition.finalist)
  })
})

test.group('palmares · bilan cumulé par équipe', () => {
  test('agrège participations, victoires et ratio par nom sur plusieurs éditions', ({ assert }) => {
    // 3 éditions. Alpha gagne les éditions 1 et 2 ; Bravo gagne la 3.
    const editions: PalmaresTournamentInput[] = [
      tournament({
        id: 1,
        eventDate: '2026-01-01',
        teams: [team(1, 'Alpha'), team(2, 'Bravo')],
        matches: [main(1, 1, 0, 2)], // Alpha bat Bravo
      }),
      tournament({
        id: 2,
        eventDate: '2026-02-01',
        teams: [team(1, 'Alpha'), team(2, 'Charlie')],
        matches: [main(1, 1, 0, 2)], // Alpha bat Charlie
      }),
      tournament({
        id: 3,
        eventDate: '2026-03-01',
        teams: [team(1, 'Bravo'), team(2, 'Alpha')],
        matches: [main(1, 2, 0, 2)], // Bravo bat Alpha
      }),
    ]

    const { teamRecords } = computePalmares(editions)
    const byName = new Map(teamRecords.map((r) => [r.teamName, r]))

    // Alpha : 3 participations, 2 victoires, 3 finales atteintes.
    assert.equal(byName.get('Alpha')!.participations, 3)
    assert.equal(byName.get('Alpha')!.wins, 2)
    assert.equal(byName.get('Alpha')!.finals, 3)
    assert.closeTo(byName.get('Alpha')!.winRate, 2 / 3, 1e-9)

    // Bravo : 2 participations, 1 victoire.
    assert.equal(byName.get('Bravo')!.participations, 2)
    assert.equal(byName.get('Bravo')!.wins, 1)
    assert.closeTo(byName.get('Bravo')!.winRate, 1 / 2, 1e-9)

    // Charlie : 1 participation, 0 victoire (a seulement joué).
    assert.equal(byName.get('Charlie')!.participations, 1)
    assert.equal(byName.get('Charlie')!.wins, 0)
    assert.equal(byName.get('Charlie')!.winRate, 0)

    // Classement : Alpha (2 victoires) en tête.
    assert.equal(teamRecords[0].teamName, 'Alpha')
  })

  test('éditions triées de la plus récente à la plus ancienne', ({ assert }) => {
    const { editions } = computePalmares([
      tournament({
        id: 1,
        name: 'Ancien',
        eventDate: '2026-01-01',
        teams: [team(1, 'A')],
        matches: [],
      }),
      tournament({
        id: 2,
        name: 'Récent',
        eventDate: '2026-12-01',
        teams: [team(1, 'A')],
        matches: [],
      }),
    ])
    assert.deepEqual(
      editions.map((e) => e.name),
      ['Récent', 'Ancien']
    )
  })

  test('liste vide → palmarès vide', ({ assert }) => {
    const { editions, teamRecords } = computePalmares([])
    assert.lengthOf(editions, 0)
    assert.lengthOf(teamRecords, 0)
  })
})
