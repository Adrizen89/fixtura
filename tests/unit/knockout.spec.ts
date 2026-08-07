import { test } from '@japa/runner'
import { buildKnockout, SchedulerError, InfeasibleScheduleError } from '#services/scheduler/index'
import type { SlotSource, Bracket, BracketMatch } from '#services/scheduler/index'

/** Qualifiés « équipes » en ordre de tête de série (teamId = numéro de série). */
function teamEntrants(n: number): SlotSource[] {
  return Array.from({ length: n }, (_, i) => ({ type: 'team', teamId: i + 1 }))
}

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function byRound(b: Bracket, code: string): BracketMatch[] {
  return b.matches.filter((m) => m.bracketRound === code)
}

/** Ensemble des paires (min-max) d'un tour, à partir de sources « team ». */
function teamPairs(matches: BracketMatch[]): Set<string> {
  const s = new Set<string>()
  for (const m of matches) {
    if (m.home.type !== 'team' || m.away.type !== 'team') continue
    const [a, b] = [m.home.teamId, m.away.teamId].sort((x, y) => x - y)
    s.add(`${a}-${b}`)
  }
  return s
}

test.group('knockout · taille de bracket & byes', () => {
  test('taille = prochaine puissance de 2, byes = size − K, K−1 matchs', ({ assert }) => {
    for (const k of [2, 3, 4, 5, 6, 7, 8, 9, 15, 16]) {
      const b = buildKnockout({ entrants: teamEntrants(k) })
      const size = nextPow2(k)
      assert.equal(b.size, size, `K=${k} : taille de bracket`)
      assert.equal(b.byes, size - k, `K=${k} : nombre de byes`)
      assert.equal(b.rounds, Math.round(Math.log2(size)), `K=${k} : nombre de tours`)

      const real = b.matches.filter((m) => !m.thirdPlace)
      assert.equal(real.length, k - 1, `K=${k} : un arbre à K qualifiés a K−1 matchs`)

      // Tout match a exactement deux participants (jamais de bye matérialisé).
      for (const m of real) {
        assert.exists(m.home)
        assert.exists(m.away)
      }
    }
  })

  test('les byes vont aux têtes de série (elles ne jouent pas le 1er tour)', ({ assert }) => {
    // K=5 → bracket de 8, 3 byes : têtes 1, 2, 3 exemptées ; 4 et 5 s'affrontent.
    const b = buildKnockout({ entrants: teamEntrants(5) })
    assert.equal(b.byes, 3)

    const firstRound = byRound(b, 'qf') // 1er tour d'un bracket de 8
    assert.equal(firstRound.length, 1, 'un seul vrai match au 1er tour')
    assert.deepEqual(teamPairs(firstRound), new Set(['4-5']), 'têtes 4 vs 5')

    const playingR1 = new Set<number>()
    for (const m of firstRound) {
      if (m.home.type === 'team') playingR1.add(m.home.teamId)
      if (m.away.type === 'team') playingR1.add(m.away.teamId)
    }
    for (const seed of [1, 2, 3]) {
      assert.isFalse(playingR1.has(seed), `la tête de série ${seed} est exemptée au 1er tour`)
    }
  })

  test('K=16 (puissance de 2) : aucun bye, bracket plein', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(16) })
    assert.equal(b.byes, 0)
    assert.equal(byRound(b, 'r16').length, 8)
    assert.equal(byRound(b, 'qf').length, 4)
    assert.equal(byRound(b, 'sf').length, 2)
    assert.equal(byRound(b, 'final').length, 1)
  })
})

test.group('knockout · structure & libellés des tours', () => {
  test('K=8 : quarts → demies → finale', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(8) })
    assert.equal(b.rounds, 3)
    assert.equal(byRound(b, 'qf').length, 4)
    assert.equal(byRound(b, 'sf').length, 2)
    assert.equal(byRound(b, 'final').length, 1)
    assert.equal(byRound(b, 'qf')[0].label, 'Quarts de finale')
    assert.equal(byRound(b, 'sf')[0].label, 'Demi-finales')
    assert.equal(byRound(b, 'final')[0].label, 'Finale')
  })

  test('exactement une finale, un seul champion', ({ assert }) => {
    for (const k of [2, 4, 5, 8, 16]) {
      const b = buildKnockout({ entrants: teamEntrants(k) })
      assert.equal(byRound(b, 'final').length, 1, `K=${k} : une finale`)
    }
  })

  test('croisement standard : tête 1 vs dernière, têtes 1 et 2 opposées (K=8)', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(8) })
    // seedPositions(8) = [1,8,4,5,2,7,3,6] → paires (1,8)(4,5)(2,7)(3,6).
    assert.deepEqual(
      teamPairs(byRound(b, 'qf')),
      new Set(['1-8', '4-5', '2-7', '3-6']),
      'appariements du 1er tour = croisement standard'
    )
  })
})

test.group('knockout · ordre topologique (banding)', () => {
  test('chaque match est dans une bande > celles de ses nourriciers', ({ assert }) => {
    for (const k of [4, 5, 8, 16]) {
      const b = buildKnockout({ entrants: teamEntrants(k), thirdPlace: false })
      const byId = new Map(b.matches.map((m) => [m.id, m]))

      for (const m of b.matches) {
        assert.isAbove(m.band, 0, `K=${k} : bande ≥ 1`)
        for (const src of [m.home, m.away]) {
          if (src.type === 'match_winner' || src.type === 'match_loser') {
            const feeder = byId.get(src.matchId)
            assert.exists(feeder, `K=${k} : nourricier ${src.matchId} existe`)
            assert.isBelow(
              feeder!.band,
              m.band,
              `K=${k} : ${m.id} après son nourricier ${src.matchId}`
            )
            // …et structurellement, un tour nourricier précède toujours (tour < tour).
            assert.isBelow(feeder!.round, m.round, `K=${k} : tour nourricier antérieur`)
          }
        }
      }
    }
  })

  test('la finale a la bande maximale ; sources sans match → bande 1', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(8) })
    assert.equal(b.bands, b.rounds, 'bracket plein : autant de bandes que de tours')

    const final = byRound(b, 'final')[0]
    assert.equal(final.band, b.bands, 'la finale est dans la dernière bande')

    // Les matchs dont les deux participants sont connus (team) ne dépendent de rien.
    for (const m of b.matches) {
      if (m.home.type === 'team' && m.away.type === 'team') {
        assert.equal(m.band, 1, `${m.id} sans nourricier → bande 1`)
      }
    }
  })
})

test.group('knockout · petite finale (3e place)', () => {
  test('K=8 avec thirdPlace : match « third » entre les perdants des demies', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(8), thirdPlace: true })
    const semis = byRound(b, 'sf').map((m) => m.id)
    const third = byRound(b, 'third')

    assert.equal(third.length, 1)
    const tp = third[0]
    assert.isTrue(tp.thirdPlace)
    assert.equal(tp.label, 'Petite finale')
    assert.equal(tp.home.type, 'match_loser')
    assert.equal(tp.away.type, 'match_loser')

    const refs = [tp.home, tp.away].map((s) => (s as { matchId: string }).matchId)
    assert.deepEqual(new Set(refs), new Set(semis), 'référence les deux demi-finales')
    assert.notEqual(refs[0], refs[1], 'deux demies distinctes')

    // K matchs au total (K−1 du bracket + la petite finale).
    assert.equal(b.matches.length, 8)
  })

  test('sans thirdPlace : aucun match « third »', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(8) })
    assert.equal(byRound(b, 'third').length, 0)
  })

  test('K=4 avec thirdPlace : petite finale entre les perdants des 2 demies', ({ assert }) => {
    const b = buildKnockout({ entrants: teamEntrants(4), thirdPlace: true })
    assert.equal(byRound(b, 'third').length, 1)
    assert.equal(b.matches.length, 4) // 3 + petite finale
  })
})

test.group('knockout · format hybride (entrants pool_rank)', () => {
  test('croisement « 1er A vs 2e B » avec des sources de poule', ({ assert }) => {
    // Ordre de série : vainqueurs de poule d'abord, puis dauphins.
    const entrants: SlotSource[] = [
      { type: 'pool_rank', pool: 'A', rank: 1 },
      { type: 'pool_rank', pool: 'B', rank: 1 },
      { type: 'pool_rank', pool: 'A', rank: 2 },
      { type: 'pool_rank', pool: 'B', rank: 2 },
    ]
    const b = buildKnockout({ entrants })
    const semis = byRound(b, 'sf')
    assert.equal(semis.length, 2)

    // seedPositions(4) = [1,4,2,3] → (A1 vs B2) et (B1 vs A2).
    const label = (s: SlotSource) => (s.type === 'pool_rank' ? `${s.pool}${s.rank}` : '?')
    const pairs = new Set(semis.map((m) => `${label(m.home)}-${label(m.away)}`))
    assert.deepEqual(pairs, new Set(['A1-B2', 'B1-A2']))
  })
})

test.group('knockout · entrées invalides / infaisable', () => {
  test('moins de 2 qualifiés → erreur explicite', ({ assert }) => {
    assert.throws(() => buildKnockout({ entrants: teamEntrants(1) }), SchedulerError)
    assert.throws(() => buildKnockout({ entrants: [] }), SchedulerError)
  })

  test('équipes en double → erreur explicite', ({ assert }) => {
    const dup: SlotSource[] = [
      { type: 'team', teamId: 1 },
      { type: 'team', teamId: 2 },
      { type: 'team', teamId: 2 },
    ]
    assert.throws(() => buildKnockout({ entrants: dup }), SchedulerError)
  })

  test('petite finale impossible sans deux demi-finales → InfeasibleScheduleError', ({
    assert,
  }) => {
    // K=2 : pas de demi-finales du tout.
    assert.throws(
      () => buildKnockout({ entrants: teamEntrants(2), thirdPlace: true }),
      InfeasibleScheduleError
    )
    // K=3 : une « demi-finale » est un bye → un seul perdant de demie.
    assert.throws(
      () => buildKnockout({ entrants: teamEntrants(3), thirdPlace: true }),
      InfeasibleScheduleError
    )
  })
})
