import { test } from '@japa/runner'
import { buildDoubleElimination, SchedulerError } from '#services/scheduler/index'
import type { SlotSource, BracketMatch } from '#services/scheduler/index'

/** Qualifiés « équipes » en ordre de tête de série (teamId = numéro de série). */
function teamEntrants(n: number): SlotSource[] {
  return Array.from({ length: n }, (_, i) => ({ type: 'team', teamId: i + 1 }))
}

const byBracket = (matches: BracketMatch[], b: string) => matches.filter((m) => m.bracket === b)
/** Ids de match référencés en `match_loser` sur l'ensemble des slots. */
function loserRefs(matches: BracketMatch[]): string[] {
  const refs: string[] = []
  for (const m of matches) {
    for (const s of [m.home, m.away]) {
      if (s.type === 'match_loser') refs.push(s.matchId)
    }
  }
  return refs
}

test.group('double élimination · structure', () => {
  test('4 équipes sans bye : tableau principal + repêchage + grande finale', ({ assert }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(4) })

    assert.equal(de.size, 4)
    assert.equal(de.winnersRounds, 2)
    assert.equal(de.losersRounds, 2) // 2·(2−1)
    assert.equal(de.byes, 0)

    // 2N−2 matchs pour une double élimination à finale unique.
    assert.lengthOf(de.matches, 6)
    assert.lengthOf(byBracket(de.matches, 'winners'), 3) // 2 demis + 1 finale WB
    assert.lengthOf(byBracket(de.matches, 'losers'), 2) // 1 mineur + 1 finale LB
    assert.lengthOf(byBracket(de.matches, 'grand_final'), 1)
  })

  test('8 équipes sans bye : comptes des tours et des matchs', ({ assert }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(8) })

    assert.equal(de.size, 8)
    assert.equal(de.winnersRounds, 3)
    assert.equal(de.losersRounds, 4) // 2·(3−1)
    assert.equal(de.byes, 0)
    assert.lengthOf(de.matches, 14) // 2·8 − 2
    assert.lengthOf(byBracket(de.matches, 'winners'), 7)
    assert.lengthOf(byBracket(de.matches, 'losers'), 6)
  })

  test('la grande finale oppose le champion du tableau principal au champion du repêchage', ({
    assert,
  }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(8) })
    const gf = byBracket(de.matches, 'grand_final')[0]

    // Vainqueur de la finale du tableau principal (wb-r3-1) côté domicile.
    assert.deepEqual(gf.home, { type: 'match_winner', matchId: 'wb-r3-1' })
    // Vainqueur de la finale du repêchage (dernier tour LB) côté extérieur.
    const lbFinal = byBracket(de.matches, 'losers').find((m) => m.round === de.losersRounds)!
    assert.deepEqual(gf.away, { type: 'match_winner', matchId: lbFinal.id })
  })
})

test.group('double élimination · repêchage (2ᵉ chance)', () => {
  test('chaque perdant du tableau principal est repêché exactement une fois', ({ assert }) => {
    for (const n of [4, 8]) {
      const de = buildDoubleElimination({ entrants: teamEntrants(n) })
      const winnersIds = byBracket(de.matches, 'winners')
        .map((m) => m.id)
        .sort()
      // Tout match du tableau principal descend son perdant vers le repêchage, une fois.
      const refs = loserRefs(de.matches).sort()
      assert.deepEqual(refs, winnersIds, `n=${n} : chaque perdant WB repêché une fois`)
    }
  })

  test('un perdant du 1er tour peut atteindre la grande finale via les repêchages', ({
    assert,
  }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(4) })

    // Le perdant de wb-r1-1 entre au repêchage…
    const lbEntry = de.matches.find(
      (m) =>
        m.bracket === 'losers' &&
        [m.home, m.away].some((s) => s.type === 'match_loser' && s.matchId === 'wb-r1-1')
    )
    assert.exists(lbEntry, 'le perdant de wb-r1-1 a un match de repêchage')

    // …dont le vainqueur alimente la finale du repêchage…
    const lbFinal = byBracket(de.matches, 'losers').find((m) => m.round === de.losersRounds)!
    const reachesLbFinal = [lbFinal.home, lbFinal.away].some(
      (s) => s.type === 'match_winner' && s.matchId === lbEntry!.id
    )
    assert.isTrue(reachesLbFinal, 'le vainqueur du repêchage rejoint la finale du repêchage')

    // …dont le vainqueur dispute la grande finale.
    const gf = byBracket(de.matches, 'grand_final')[0]
    assert.deepEqual(gf.away, { type: 'match_winner', matchId: lbFinal.id })
  })
})

test.group('double élimination · byes', () => {
  // N non-puissance de 2 : byes = size − N, et toujours 2N−2 matchs (finale unique).
  for (const { n, size, byes } of [
    { n: 3, size: 4, byes: 1 },
    { n: 5, size: 8, byes: 3 },
    { n: 6, size: 8, byes: 2 },
    { n: 7, size: 8, byes: 1 },
  ]) {
    test(`${n} équipes → ${byes} bye(s), ${2 * n - 2} matchs`, ({ assert }) => {
      const de = buildDoubleElimination({ entrants: teamEntrants(n) })
      assert.equal(de.size, size)
      assert.equal(de.byes, byes)
      assert.lengthOf(de.matches, 2 * n - 2)
      // Invariant conservé malgré les byes : chaque perdant WB repêché une fois.
      assert.deepEqual(
        loserRefs(de.matches).sort(),
        byBracket(de.matches, 'winners')
          .map((m) => m.id)
          .sort()
      )
    })
  }

  test('2 équipes : cas dégénéré (finale principale + grande finale, pas de match de repêchage)', ({
    assert,
  }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(2) })
    assert.equal(de.winnersRounds, 1)
    assert.equal(de.losersRounds, 0)
    assert.lengthOf(de.matches, 2) // wb-r1-1 + gf-1
    assert.lengthOf(byBracket(de.matches, 'losers'), 0)
    // Le champion du repêchage est le perdant de l'unique match principal.
    const gf = byBracket(de.matches, 'grand_final')[0]
    assert.deepEqual(gf.away, { type: 'match_loser', matchId: 'wb-r1-1' })
  })
})

test.group('double élimination · ordonnancement & robustesse', () => {
  test('bandes topologiques : chaque match est strictement après ses nourriciers', ({ assert }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(8) })
    const byId = new Map(de.matches.map((m) => [m.id, m]))
    for (const m of de.matches) {
      let feederBand = 0
      for (const s of [m.home, m.away]) {
        if (s.type === 'match_winner' || s.type === 'match_loser') {
          const feeder = byId.get(s.matchId)!
          assert.isBelow(feeder.band, m.band, `${m.id} après ${feeder.id}`)
          feederBand = Math.max(feederBand, feeder.band)
        }
      }
      assert.equal(m.band, feederBand + 1)
    }
    assert.equal(de.bands, Math.max(...de.matches.map((m) => m.band)))
  })

  test('identifiants de match uniques', ({ assert }) => {
    const de = buildDoubleElimination({ entrants: teamEntrants(7) })
    const ids = de.matches.map((m) => m.id)
    assert.lengthOf([...new Set(ids)], ids.length)
  })

  test('moins de 2 qualifiés → erreur explicite', ({ assert }) => {
    assert.throws(
      () => buildDoubleElimination({ entrants: teamEntrants(1) }),
      SchedulerError as unknown as ErrorConstructor
    )
  })

  test('équipe en double → erreur explicite', ({ assert }) => {
    assert.throws(
      () =>
        buildDoubleElimination({
          entrants: [
            { type: 'team', teamId: 1 },
            { type: 'team', teamId: 1 },
          ],
        }),
      SchedulerError as unknown as ErrorConstructor
    )
  })
})
