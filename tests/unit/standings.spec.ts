import { test } from '@japa/runner'
import { computeStandings } from '#services/standings'
import type { StandingsMatchInput, StandingsTeamInput } from '#services/standings'

function teams(...names: string[]): StandingsTeamInput[] {
  return names.map((name, i) => ({ id: i + 1, name }))
}

/** Raccourci de match : (idDom, scoreDom, scoreExt, idExt). */
function match(
  homeTeamId: number,
  homeScore: number,
  awayScore: number,
  awayTeamId: number
): StandingsMatchInput {
  return { homeTeamId, awayTeamId, homeScore, awayScore }
}

test.group('standings · points', () => {
  test('victoire = 3, nul = 1, défaite = 0', ({ assert }) => {
    const [a, b, c] = teams('A', 'B', 'C')
    const table = computeStandings(
      [a, b, c],
      [
        match(1, 2, 0, 2), // A bat B
        match(2, 1, 1, 3), // B et C nul
      ]
    )

    const byId = new Map(table.map((r) => [r.teamId, r]))
    assert.equal(byId.get(1)!.points, 3) // A : 1 victoire
    assert.equal(byId.get(1)!.won, 1)
    assert.equal(byId.get(2)!.points, 1) // B : 1 défaite + 1 nul
    assert.equal(byId.get(2)!.drawn, 1)
    assert.equal(byId.get(2)!.lost, 1)
    assert.equal(byId.get(3)!.points, 1) // C : 1 nul
    assert.equal(byId.get(3)!.drawn, 1)
  })

  test('agrège buts pour/contre et parties jouées', ({ assert }) => {
    const [a, b] = teams('A', 'B')
    const table = computeStandings([a, b], [match(1, 3, 1, 2), match(2, 2, 2, 1)])
    const byId = new Map(table.map((r) => [r.teamId, r]))

    assert.equal(byId.get(1)!.played, 2)
    assert.equal(byId.get(1)!.goalsFor, 5) // 3 + 2
    assert.equal(byId.get(1)!.goalsAgainst, 3) // 1 + 2
    assert.equal(byId.get(1)!.goalDifference, 2)
    assert.equal(byId.get(1)!.points, 4) // victoire + nul
  })
})

test.group('standings · départages', () => {
  test('à points égaux, la différence de buts départage', ({ assert }) => {
    const [a, b, c] = teams('A', 'B', 'C')
    // A et B gagnent chacun 1 match (3 pts), mais A avec une meilleure différence.
    const table = computeStandings(
      [a, b, c],
      [
        match(1, 5, 0, 3), // A +5
        match(2, 1, 0, 3), // B +1
      ]
    )

    assert.equal(table[0].teamId, 1) // A devant grâce à la diff
    assert.equal(table[1].teamId, 2) // B
    assert.equal(table[0].rank, 1)
    assert.equal(table[1].rank, 2)
  })

  test('à points et diff égaux, les buts marqués départagent', ({ assert }) => {
    const [a, b, c, d] = teams('A', 'B', 'C', 'D')
    // A : bat C 3-1 (diff +2, BP 3). B : bat D 2-0 (diff +2, BP 2). A devant (plus de BP).
    const table = computeStandings([a, b, c, d], [match(1, 3, 1, 3), match(2, 2, 0, 4)])

    assert.equal(table[0].teamId, 1) // A (3 BP)
    assert.equal(table[1].teamId, 2) // B (2 BP)
  })

  test('égalité parfaite → même rang, ordre stable par nom', ({ assert }) => {
    const [a, b, c, d] = teams('Alpha', 'Bravo', 'Charlie', 'Delta')
    // Alpha et Bravo : mêmes points/diff/BP → rang partagé, Alpha avant Bravo (nom).
    const table = computeStandings(
      [a, b, c, d],
      [
        match(1, 2, 0, 3), // Alpha 2-0 Charlie
        match(2, 2, 0, 4), // Bravo 2-0 Delta
      ]
    )

    assert.equal(table[0].teamName, 'Alpha')
    assert.equal(table[1].teamName, 'Bravo')
    assert.equal(table[0].rank, 1)
    assert.equal(table[1].rank, 1) // rang partagé
    assert.equal(table[2].rank, 3) // le rang 2 est « sauté »
  })
})

test.group('standings · cas limites', () => {
  test('sans match, toutes les équipes à 0, triées par nom', ({ assert }) => {
    const table = computeStandings(teams('Zeta', 'Alpha', 'Mu'), [])
    assert.deepEqual(
      table.map((r) => r.teamName),
      ['Alpha', 'Mu', 'Zeta']
    )
    assert.isTrue(table.every((r) => r.played === 0 && r.points === 0 && r.rank === 1))
  })

  test('une équipe sans match (diff 0) devance une équipe qui a perdu (diff -1)', ({ assert }) => {
    const [a, b, c] = teams('A', 'B', 'C')
    const table = computeStandings([a, b, c], [match(1, 1, 0, 2)])
    assert.equal(table[0].teamId, 1) // A en tête (3 pts)

    const cRow = table.find((r) => r.teamId === 3)!
    assert.equal(cRow.played, 0)
    assert.equal(cRow.points, 0)

    // C (0 pt, diff 0) passe devant B qui a perdu (0 pt, diff -1).
    assert.equal(table[1].teamId, 3)
    assert.equal(table[2].teamId, 2)
  })

  test('ignore un match dont une équipe est hors tournoi', ({ assert }) => {
    const [a, b] = teams('A', 'B')
    const table = computeStandings([a, b], [match(1, 3, 0, 99)])
    assert.isTrue(table.every((r) => r.played === 0))
  })
})
