import { test } from '@japa/runner'
import { generatePhased } from '#services/scheduler/formats'
import { SchedulerError } from '#services/scheduler/index'
import type { SchedulerParams } from '#services/scheduler/index'
import type { PhasedMatch } from '#services/scheduler/formats'

function baseParams(n: number, numTerrains = 2): SchedulerParams {
  return {
    teamIds: Array.from({ length: n }, (_, i) => i + 1),
    numTerrains,
    startTime: '09:00',
    matchDurationMin: 15,
    breakDurationMin: 5,
    lunchStart: null,
    lunchDurationMin: 0,
  }
}

/** slotIndex par bracketId, pour vérifier l'ordre topologique (nourricier avant dépendant). */
function slotByBracketId(matches: PhasedMatch[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const x of matches) if (x.bracketId) m.set(x.bracketId, x.slotIndex)
  return m
}

test.group('formats · championnat (non-régression)', () => {
  test('délègue au round-robin : tous en stage main, C(n,2) matchs, équipes connues', ({
    assert,
  }) => {
    const s = generatePhased(baseParams(5), 'championship')
    assert.equal(s.format, 'championship')
    assert.equal(s.matches.length, 10) // C(5,2)
    for (const m of s.matches) {
      assert.equal(m.stage, 'main')
      assert.isNotNull(m.homeTeamId)
      assert.isNotNull(m.awayTeamId)
      assert.isNull(m.home)
      assert.isNull(m.bracketId)
    }
    assert.equal(s.matches[0].startTime, '09:00')
  })
})

test.group('formats · poules', () => {
  test('8 équipes / 2 poules → 12 matchs, stage pool, étiquettes A/B, équipes connues', ({
    assert,
  }) => {
    const s = generatePhased(baseParams(8), 'pools', { numPools: 2 })
    assert.equal(s.matches.length, 12) // 2 poules de 4 → 6 + 6
    const labels = new Set(s.matches.map((m) => m.groupLabel))
    assert.deepEqual([...labels].sort(), ['A', 'B'])
    for (const m of s.matches) {
      assert.equal(m.stage, 'pool')
      assert.isNotNull(m.homeTeamId)
      assert.isNull(m.bracketRound)
    }
  })

  test('numPools manquant → SchedulerError explicite', ({ assert }) => {
    assert.throws(() => generatePhased(baseParams(8), 'pools', {}), SchedulerError)
  })
})

test.group('formats · élimination directe', () => {
  test('8 équipes → 7 matchs ; 1er tour aux équipes connues, tours suivants différés', ({
    assert,
  }) => {
    const s = generatePhased(baseParams(8), 'knockout')
    assert.equal(s.matches.length, 7) // K-1
    const qf = s.matches.filter((m) => m.bracketRound === 'qf')
    const sf = s.matches.filter((m) => m.bracketRound === 'sf')
    const final = s.matches.filter((m) => m.bracketRound === 'final')
    assert.equal(qf.length, 4)
    assert.equal(sf.length, 2)
    assert.equal(final.length, 1)

    // 1er tour : équipes connues.
    for (const m of qf) {
      assert.equal(m.stage, 'knockout')
      assert.isNotNull(m.homeTeamId)
      assert.isNull(m.home)
    }
    // Tours suivants : participants différés (source match_winner).
    for (const m of [...sf, ...final]) {
      assert.isNull(m.homeTeamId)
      assert.equal(m.home?.type, 'match_winner')
    }
  })

  test('placement par bandes : un match démarre après ses nourriciers', ({ assert }) => {
    const s = generatePhased(baseParams(8), 'knockout')
    const slotOf = slotByBracketId(s.matches)
    for (const m of s.matches) {
      for (const src of [m.home, m.away]) {
        if (src && (src.type === 'match_winner' || src.type === 'match_loser')) {
          assert.isAbove(
            m.slotIndex,
            slotOf.get(src.matchId)!,
            `${m.bracketId} doit être placé après son nourricier ${src.matchId}`
          )
        }
      }
    }
  })

  test('petite finale : 8 matchs (7 + 3e place)', ({ assert }) => {
    const s = generatePhased(baseParams(8), 'knockout', { thirdPlace: true })
    assert.equal(s.matches.length, 8)
    assert.equal(s.matches.filter((m) => m.bracketRound === 'third').length, 1)
  })
})

test.group('formats · hybride (poules → phase finale)', () => {
  test('poules puis bracket de qualifiés ; la phase finale démarre après les poules', ({
    assert,
  }) => {
    const s = generatePhased(baseParams(8), 'hybrid', { numPools: 2, qualifiersPerPool: 2 })
    const pool = s.matches.filter((m) => m.stage === 'pool')
    const ko = s.matches.filter((m) => m.stage === 'knockout')
    assert.equal(pool.length, 12) // 2 poules de 4
    assert.equal(ko.length, 3) // bracket de 4 → 3 matchs

    // Les qualifiés sont des sources de poule (au 1er tour du bracket).
    const semis = ko.filter((m) => m.bracketRound === 'sf')
    assert.equal(semis.length, 2)
    for (const m of semis) {
      assert.equal(m.home?.type, 'pool_rank')
      assert.equal(m.away?.type, 'pool_rank')
    }

    // Toute la phase finale démarre après le dernier match de poule.
    const lastPoolSlot = Math.max(...pool.map((m) => m.slotIndex))
    for (const m of ko) assert.isAbove(m.slotIndex, lastPoolSlot)
  })

  test('qualifiés > taille de poule → SchedulerError', ({ assert }) => {
    // 6 équipes / 3 poules de 2 : impossible de qualifier 3 par poule.
    assert.throws(
      () => generatePhased(baseParams(6), 'hybrid', { numPools: 3, qualifiersPerPool: 3 }),
      SchedulerError
    )
  })
})

test.group('formats · double élimination (#111)', () => {
  test('place le tableau principal + repêchage + grande finale, ordre topologique', ({
    assert,
  }) => {
    const s = generatePhased(baseParams(8), 'double_elimination')
    assert.equal(s.format, 'double_elimination')
    assert.equal(s.matches.length, 14) // 2N−2

    for (const m of s.matches) {
      assert.equal(m.stage, 'knockout')
      assert.isNotNull(m.bracketId)
      assert.isAtLeast(m.terrainNumber, 1)
      assert.match(m.startTime, /^\d{2}:\d{2}$/)
    }

    const rounds = new Set(s.matches.map((m) => m.bracketRound))
    assert.isTrue(
      [...rounds].some((r) => r?.startsWith('wb-r')),
      'des tours principaux'
    )
    assert.isTrue(
      [...rounds].some((r) => r?.startsWith('lb-r')),
      'des tours de repêchage'
    )
    assert.isTrue(rounds.has('gf'), 'une grande finale')

    // Ordre topologique : un nourricier est placé sur un créneau antérieur.
    const slotById = slotByBracketId(s.matches)
    for (const m of s.matches) {
      for (const src of [m.home, m.away]) {
        if (src && (src.type === 'match_winner' || src.type === 'match_loser')) {
          assert.isBelow(slotById.get(src.matchId)!, m.slotIndex, `${m.bracketId} après source`)
        }
      }
    }
  })

  test('byes : 6 équipes → 10 matchs placés', ({ assert }) => {
    const s = generatePhased(baseParams(6), 'double_elimination')
    assert.equal(s.matches.length, 10) // 2·6 − 2
  })
})
