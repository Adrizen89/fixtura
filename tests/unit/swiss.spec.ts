import { test } from '@japa/runner'
import {
  pairSwissRound,
  defaultSwissRounds,
  pairKey,
  type SwissPairing,
} from '#services/scheduler/swiss'

/** Ajoute les paires d'une ronde (+ bye éventuel) aux ensembles de suivi. */
function record(
  round: { pairings: SwissPairing[]; byeTeamId: number | null },
  played: Set<string>,
  byed: Set<number>
) {
  for (const p of round.pairings) played.add(pairKey(p.homeTeamId, p.awayTeamId))
  if (round.byeTeamId !== null) byed.add(round.byeTeamId)
}

test.group('swiss · nombre de rondes', () => {
  test('⌈log₂(N)⌉ borné à [1, N-1]', ({ assert }) => {
    assert.equal(defaultSwissRounds(2), 1)
    assert.equal(defaultSwissRounds(4), 2)
    assert.equal(defaultSwissRounds(8), 3)
    assert.equal(defaultSwissRounds(16), 4)
    assert.equal(defaultSwissRounds(5), 3) // ⌈log₂5⌉ = 3
    assert.equal(defaultSwissRounds(6), 3)
    assert.equal(defaultSwissRounds(3), 2) // ⌈log₂3⌉ = 2, ≤ N-1 = 2
  })

  test('cas dégénérés', ({ assert }) => {
    assert.equal(defaultSwissRounds(1), 0)
    assert.equal(defaultSwissRounds(0), 0)
  })
})

test.group('swiss · appariement d’une ronde', () => {
  test('ronde 1 (N pair) : appariement par proximité, aucun bye', ({ assert }) => {
    const round = pairSwissRound([1, 2, 3, 4], new Set(), new Set())
    assert.isNull(round.byeTeamId)
    assert.lengthOf(round.pairings, 2)
    // Tête de série adjacente : 1-2, 3-4.
    assert.deepEqual(
      round.pairings.map((p) => pairKey(p.homeTeamId, p.awayTeamId)),
      ['1-2', '3-4']
    )
  })

  test('N impair : un bye pour la moins bien classée', ({ assert }) => {
    const round = pairSwissRound([1, 2, 3, 4, 5], new Set(), new Set())
    assert.equal(round.byeTeamId, 5) // dernière du classement
    assert.lengthOf(round.pairings, 2)
    // Les 4 restantes sont toutes appariées, chacune une seule fois.
    const involved = round.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    assert.deepEqual(involved.sort(), [1, 2, 3, 4])
  })

  test('le bye évite une équipe déjà exemptée', ({ assert }) => {
    // 5 a déjà eu le bye → il va à la moins bien classée suivante (4).
    const round = pairSwissRound([1, 2, 3, 4, 5], new Set(), new Set([5]))
    assert.equal(round.byeTeamId, 4)
  })

  test('n’édite jamais un match déjà joué (rematch évité)', ({ assert }) => {
    // 1-2 et 3-4 déjà joués → la ronde doit croiser les paires.
    const played = new Set(['1-2', '3-4'])
    const round = pairSwissRound([1, 3, 2, 4], played, new Set())
    for (const p of round.pairings) {
      assert.notInclude(['1-2', '3-4'], pairKey(p.homeTeamId, p.awayTeamId))
    }
    // Toutes les équipes jouent.
    assert.deepEqual(
      round.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId]).sort(),
      [1, 2, 3, 4]
    )
  })
})

test.group('swiss · déroulé complet', () => {
  test('4 équipes / 3 rondes : aucun rematch (round-robin complet émergent)', ({ assert }) => {
    const teams = [1, 2, 3, 4]
    const played = new Set<string>()
    const byed = new Set<number>()
    // On simule un classement : l'équipe d'id le plus petit gagne toujours → ordre stable.
    let order = [...teams]

    for (let r = 0; r < 3; r++) {
      const round = pairSwissRound(order, played, byed)
      assert.isNull(round.byeTeamId) // pair → jamais de bye
      // Aucun rematch dans cette ronde.
      for (const p of round.pairings) {
        assert.isFalse(played.has(pairKey(p.homeTeamId, p.awayTeamId)))
      }
      record(round, played, byed)
      // « Classement » : vainqueurs (id le plus petit de chaque paire) devant.
      const winners = round.pairings.map((p) => Math.min(p.homeTeamId, p.awayTeamId))
      const losers = round.pairings.map((p) => Math.max(p.homeTeamId, p.awayTeamId))
      order = [...winners.sort((a, b) => a - b), ...losers.sort((a, b) => a - b)]
    }

    // 3 rondes × 2 matchs = 6 paires distinctes = C(4,2) : chaque équipe a joué chaque autre.
    assert.equal(played.size, 6)
  })

  test('5 équipes : le bye tourne, personne exempté deux fois avant tout le monde', ({
    assert,
  }) => {
    const teams = [1, 2, 3, 4, 5]
    const played = new Set<string>()
    const byed = new Set<number>()
    const byeHistory: number[] = []
    let order = [...teams]

    for (let r = 0; r < 5; r++) {
      const round = pairSwissRound(order, played, byed)
      assert.isNotNull(round.byeTeamId) // impair → toujours un bye
      byeHistory.push(round.byeTeamId!)
      record(round, played, byed)
      // Rotation d'ordre grossière pour varier les classements.
      order = [...order.slice(1), order[0]]
    }

    // Sur 5 rondes et 5 équipes, chaque équipe a été exemptée exactement une fois.
    assert.deepEqual([...byeHistory].sort(), [1, 2, 3, 4, 5])
  })

  test('équilibrage : les équipes à égalité de points sont appariées entre elles', ({ assert }) => {
    // Ordre de classement : [1,2] à 3 pts, [3,4] à 0 pt. Ronde suivante doit apparier
    // dans les groupes de score (1 avec 2 impossible si déjà joué → 1-3/2-4 sinon 1-2/3-4).
    const played = new Set<string>() // aucun match joué entre eux jusqu'ici
    const round = pairSwissRound([1, 2, 3, 4], played, new Set())
    // 1 (tête) est apparié au plus proche disponible : 2.
    assert.equal(pairKey(round.pairings[0].homeTeamId, round.pairings[0].awayTeamId), '1-2')
    assert.equal(pairKey(round.pairings[1].homeTeamId, round.pairings[1].awayTeamId), '3-4')
  })
})
