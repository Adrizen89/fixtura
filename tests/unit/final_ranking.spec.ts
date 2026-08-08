import { test } from '@japa/runner'
import {
  finalRanking,
  ordinalFr,
  type FinalMatch,
} from '../../inertia/composables/final_ranking.js'

/**
 * Classement final (podium) d'un tableau à élimination directe (issue #106).
 * Logique pure : 1er/2e ← finale, 3e/4e ← petite finale, départage aux t.a.b. inclus.
 */
function match(over: Partial<FinalMatch> & { bracketRound: string }): FinalMatch {
  return {
    homeTeam: 'Alpha',
    awayTeam: 'Bravo',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    shootoutWinnerSide: null,
    ...over,
  }
}

test.group('final_ranking', () => {
  test('finale non jouée → podium vide', ({ assert }) => {
    assert.lengthOf(finalRanking([match({ bracketRound: 'final' })]), 0)
  })

  test('finale jouée → 1er = vainqueur, 2e = perdant', ({ assert }) => {
    const ranking = finalRanking([
      match({ bracketRound: 'final', status: 'finished', homeScore: 2, awayScore: 1 }),
    ])
    assert.deepEqual(ranking, [
      { rank: 1, teamName: 'Alpha' },
      { rank: 2, teamName: 'Bravo' },
    ])
  })

  test('finale + petite finale → podium complet 1er/2e/3e/4e', ({ assert }) => {
    const ranking = finalRanking([
      match({ bracketRound: 'final', status: 'finished', homeScore: 3, awayScore: 0 }),
      match({
        bracketRound: 'third',
        homeTeam: 'Charlie',
        awayTeam: 'Delta',
        status: 'finished',
        homeScore: 1,
        awayScore: 2,
      }),
    ])
    assert.deepEqual(ranking, [
      { rank: 1, teamName: 'Alpha' },
      { rank: 2, teamName: 'Bravo' },
      { rank: 3, teamName: 'Delta' },
      { rank: 4, teamName: 'Charlie' },
    ])
  })

  test('finale nulle départagée aux tirs au but', ({ assert }) => {
    const ranking = finalRanking([
      match({
        bracketRound: 'final',
        status: 'finished',
        homeScore: 1,
        awayScore: 1,
        shootoutWinnerSide: 'away',
      }),
    ])
    assert.deepEqual(ranking, [
      { rank: 1, teamName: 'Bravo' },
      { rank: 2, teamName: 'Alpha' },
    ])
  })

  test('petite finale non jouée → seulement 1er/2e', ({ assert }) => {
    const ranking = finalRanking([
      match({ bracketRound: 'final', status: 'finished', homeScore: 2, awayScore: 0 }),
      match({ bracketRound: 'third', homeTeam: 'Charlie', awayTeam: 'Delta' }),
    ])
    assert.lengthOf(ranking, 2)
  })

  test('ordinalFr', ({ assert }) => {
    assert.equal(ordinalFr(1), '1er')
    assert.equal(ordinalFr(2), '2e')
    assert.equal(ordinalFr(4), '4e')
  })
})
