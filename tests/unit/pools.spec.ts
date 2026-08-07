import { test } from '@japa/runner'
import {
  splitIntoPools,
  generatePoolPairings,
  placePoolMatches,
  poolLabel,
  SchedulerError,
} from '#services/scheduler/index'
import type { PlacedPoolMatch, PoolPairing } from '#services/scheduler/index'

function teams(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1)
}

function sizes(pools: number[][]): number[] {
  return pools.map((p) => p.length)
}

/** Vérifie que le placement respecte la contrainte de repos (pas deux créneaux consécutifs). */
function assertRestRespected(assert: any, placed: PlacedPoolMatch[]) {
  const bySlot = new Map<number, Set<number>>()
  for (const m of placed) {
    const set = bySlot.get(m.slotIndex) ?? new Set<number>()
    set.add(m.homeTeamId)
    set.add(m.awayTeamId)
    bySlot.set(m.slotIndex, set)
  }
  const slots = [...bySlot.keys()].sort((a, b) => a - b)
  for (let i = 1; i < slots.length; i++) {
    const prev = bySlot.get(slots[i - 1])!
    const cur = bySlot.get(slots[i])!
    for (const t of cur) {
      assert.isFalse(
        prev.has(t),
        `l'équipe ${t} joue deux créneaux consécutifs (${slots[i - 1]} → ${slots[i]})`
      )
    }
  }
}

test.group('pools · splitIntoPools (serpentin)', () => {
  test('répartit également quand N est divisible par le nombre de poules', ({ assert }) => {
    const pools = splitIntoPools(teams(8), 2)
    assert.deepEqual(sizes(pools), [4, 4])
    assert.deepEqual(
      [...pools.flat()].sort((a, b) => a - b),
      teams(8)
    )
  })

  test('gère le reste : tailles à ±1 (10 équipes, 3 poules → 3/3/4)', ({ assert }) => {
    const pools = splitIntoPools(teams(10), 3)
    const s = sizes(pools)
    assert.equal(
      s.reduce((a, b) => a + b, 0),
      10
    )
    assert.isTrue(Math.max(...s) - Math.min(...s) <= 1)
    assert.deepEqual(s, [3, 3, 4])
    assert.deepEqual(
      [...pools.flat()].sort((a, b) => a - b),
      teams(10)
    )
  })

  test('applique le serpentin (têtes de série réparties)', ({ assert }) => {
    // 4 équipes, 2 poules → snake : A = [1, 4], B = [2, 3].
    assert.deepEqual(splitIntoPools([1, 2, 3, 4], 2), [
      [1, 4],
      [2, 3],
    ])
  })

  test('chaque équipe apparaît exactement une fois (aucune perte, aucun doublon)', ({ assert }) => {
    const pools = splitIntoPools(teams(15), 4)
    assert.deepEqual(
      [...pools.flat()].sort((a, b) => a - b),
      teams(15)
    )
    const s = sizes(pools)
    assert.isTrue(Math.max(...s) - Math.min(...s) <= 1)
  })

  test('erreurs explicites : doublons, < 2 équipes, < 1 poule, plus de poules que d’équipes', ({
    assert,
  }) => {
    assert.throws(() => splitIntoPools([1, 1, 2], 2), SchedulerError)
    assert.throws(() => splitIntoPools([1], 1), SchedulerError)
    assert.throws(() => splitIntoPools(teams(4), 0), SchedulerError)
    assert.throws(() => splitIntoPools(teams(3), 4), SchedulerError)
  })
})

test.group('pools · generatePoolPairings', () => {
  test('round-robin par poule (C(k,2) matchs) + étiquettes A/B', ({ assert }) => {
    // 8 équipes, 2 poules de 4 → 6 matchs par poule.
    const pairings = generatePoolPairings(teams(8), 2)
    assert.equal(pairings.length, 12)

    const byLabel = new Map<string, PoolPairing[]>()
    for (const p of pairings) {
      byLabel.set(p.groupLabel, [...(byLabel.get(p.groupLabel) ?? []), p])
    }
    assert.deepEqual([...byLabel.keys()].sort(), ['A', 'B'])
    assert.equal(byLabel.get('A')!.length, 6)
    assert.equal(byLabel.get('B')!.length, 6)
  })

  test('aucune rencontre inter-poules', ({ assert }) => {
    const pools = splitIntoPools(teams(10), 3)
    const poolOf = new Map<number, string>()
    pools.forEach((teamIds, i) => teamIds.forEach((id) => poolOf.set(id, poolLabel(i))))

    for (const p of generatePoolPairings(teams(10), 3)) {
      assert.equal(poolOf.get(p.homeTeamId), p.groupLabel)
      assert.equal(poolOf.get(p.awayTeamId), p.groupLabel)
    }
  })

  test('chaque paire intra-poule se rencontre exactement une fois', ({ assert }) => {
    const pools = splitIntoPools(teams(9), 3)
    const expected = new Set<string>()
    for (const poolTeams of pools) {
      for (let i = 0; i < poolTeams.length; i++) {
        for (let j = i + 1; j < poolTeams.length; j++) {
          const [a, b] = [poolTeams[i], poolTeams[j]].sort((x, y) => x - y)
          expected.add(`${a}-${b}`)
        }
      }
    }

    const seen = new Set<string>()
    for (const p of generatePoolPairings(teams(9), 3)) {
      const [a, b] = [p.homeTeamId, p.awayTeamId].sort((x, y) => x - y)
      const k = `${a}-${b}`
      assert.isFalse(seen.has(k), `paire ${k} en double`)
      seen.add(k)
    }
    assert.deepEqual([...seen].sort(), [...expected].sort())
  })
})

test.group('pools · placePoolMatches', () => {
  test('place tous les matchs et respecte la contrainte de repos', ({ assert }) => {
    const pairings = generatePoolPairings(teams(12), 3) // 3 poules de 4 → 18 matchs
    const { placed } = placePoolMatches(pairings, 2)
    assert.equal(placed.length, pairings.length)
    assertRestRespected(assert, placed)
  })

  test('un seul terrain : repos respecté, tous placés', ({ assert }) => {
    const pairings = generatePoolPairings(teams(10), 2) // 2 poules de 5 → 20 matchs
    const { placed } = placePoolMatches(pairings, 1)
    assert.equal(placed.length, pairings.length)
    assertRestRespected(assert, placed)
  })

  test('conserve l’étiquette de poule sur chaque match placé', ({ assert }) => {
    const pairings = generatePoolPairings(teams(8), 2)
    const labelByPair = new Map(
      pairings.map((p) => [`${p.homeTeamId}-${p.awayTeamId}`, p.groupLabel])
    )
    const { placed } = placePoolMatches(pairings, 2)
    for (const m of placed) {
      assert.equal(m.groupLabel, labelByPair.get(`${m.homeTeamId}-${m.awayTeamId}`))
      assert.match(m.groupLabel, /^[AB]$/)
    }
  })
})
