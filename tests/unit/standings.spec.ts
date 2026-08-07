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

  test('confrontation directe : le vainqueur passe devant malgré une moins bonne diff.', ({
    assert,
  }) => {
    const [a, b, c, d] = teams('A', 'B', 'C', 'D')
    // A et B finissent à 6 pts. B a une bien meilleure diff. générale (+9 vs -1) mais
    // A l'a battu en confrontation directe → A doit passer devant. Idem pour C > D.
    const table = computeStandings(
      [a, b, c, d],
      [
        match(1, 1, 0, 2), // A bat B
        match(1, 1, 0, 3), // A bat C
        match(1, 0, 3, 4), // A perd contre D
        match(2, 1, 0, 3), // B bat C
        match(2, 1, 0, 4), // B bat D
        match(3, 1, 0, 4), // C bat D
      ]
    )

    const byId = new Map(table.map((r) => [r.teamId, r]))
    assert.equal(byId.get(1)!.points, 6)
    assert.equal(byId.get(2)!.points, 6)
    // Confrontation directe A>B et C>D, alors que la diff. générale donnerait l'inverse.
    assert.equal(table[0].teamId, 1) // A
    assert.equal(table[1].teamId, 2) // B
    assert.equal(table[2].teamId, 3) // C
    assert.equal(table[3].teamId, 4) // D
    assert.deepEqual(
      table.map((r) => r.rank),
      [1, 2, 3, 4]
    )
  })

  test('égalité à 3 équipes : le mini-classement départage (issue #33)', ({ assert }) => {
    const [a, b, c, x, y] = teams('A', 'B', 'C', 'X', 'Y')
    // A, B, C finissent tous à 6 pts. Entre eux : A bat B et C, B bat C → mini-classement
    // A (6) > B (3) > C (0). La diff. générale mettrait pourtant B en tête (+9).
    const table = computeStandings(
      [a, b, c, x, y],
      [
        match(1, 1, 0, 2), // A bat B
        match(1, 1, 0, 3), // A bat C
        match(2, 5, 0, 3), // B bat C largement
        match(1, 0, 1, 4), // A perd contre X
        match(2, 5, 0, 4), // B bat X largement
        match(3, 1, 0, 4), // C bat X
        match(3, 1, 0, 5), // C bat Y
      ]
    )

    const byId = new Map(table.map((r) => [r.teamId, r]))
    assert.equal(byId.get(1)!.points, 6)
    assert.equal(byId.get(2)!.points, 6)
    assert.equal(byId.get(3)!.points, 6)
    assert.isAbove(byId.get(2)!.goalDifference, byId.get(1)!.goalDifference) // B mieux en diff.
    // Le mini-classement (confrontation directe) l'emporte : A > B > C.
    assert.equal(table[0].teamId, 1) // A
    assert.equal(table[1].teamId, 2) // B
    assert.equal(table[2].teamId, 3) // C
    assert.deepEqual([table[0].rank, table[1].rank, table[2].rank], [1, 2, 3])
  })

  test('égalité circulaire à 3 équipes → repli sur les critères généraux, rang partagé', ({
    assert,
  }) => {
    const [a, b, c] = teams('Alpha', 'Bravo', 'Charlie')
    // Cycle A>B>C>A : chacun 3 pts, mini-classement parfaitement égal (3 pts, diff 0,
    // 3 BP chacun) → la confrontation directe ne départage pas. Diff. et BP généraux
    // sont eux aussi égaux → même rang, ordre stable par nom.
    const table = computeStandings(
      [a, b, c],
      [
        match(1, 3, 0, 2), // Alpha bat Bravo
        match(2, 3, 0, 3), // Bravo bat Charlie
        match(3, 3, 0, 1), // Charlie bat Alpha
      ]
    )

    assert.isTrue(table.every((r) => r.points === 3 && r.rank === 1))
    assert.deepEqual(
      table.map((r) => r.teamName),
      ['Alpha', 'Bravo', 'Charlie']
    )
  })

  test('sans confrontation directe (équipes jamais opposées), la diff. générale départage', ({
    assert,
  }) => {
    const [a, b, c, d] = teams('A', 'B', 'C', 'D')
    // A et B ne se sont jamais rencontrés → confrontation directe nulle des deux côtés →
    // repli sur la diff. générale (A +5, B +1).
    const table = computeStandings(
      [a, b, c, d],
      [
        match(1, 5, 0, 3), // A bat C +5
        match(2, 1, 0, 4), // B bat D +1
      ]
    )

    assert.equal(table[0].teamId, 1) // A (meilleure diff.)
    assert.equal(table[1].teamId, 2) // B
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
