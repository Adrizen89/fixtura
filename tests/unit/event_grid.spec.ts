import { test } from '@japa/runner'
import { placeEventGrid, SchedulerError } from '#services/scheduler/index'
import type { EventGridUnit, EventGridPlacement } from '#services/scheduler/index'

/**
 * Solveur de grille unifié (#32) — placement d'un mélange round-robin +
 * élimination directe sur un pool de terrains partagé. On vérifie :
 *  - aucune collision (créneau × terrain), plafond de terrains respecté ;
 *  - une équipe ne joue jamais deux créneaux consécutifs (unités round-robin) ;
 *  - un match de bracket est placé STRICTEMENT après tous ses nourriciers ;
 *  - toutes les unités placées exactement une fois.
 */

function rr(categoryId: number, home: number, away: number): EventGridUnit {
  return {
    categoryId,
    key: `${categoryId}:${home}-${away}`,
    blockingTeams: [home, away],
    predecessors: [],
  }
}

function ko(
  categoryId: number,
  id: string,
  blockingTeams: number[],
  predecessors: string[]
): EventGridUnit {
  return { categoryId, key: `${categoryId}:${id}`, blockingTeams, predecessors }
}

/** Round-robin complet d'une catégorie (C(n,2) unités). */
function rrCategory(categoryId: number, firstId: number, n: number): EventGridUnit[] {
  const units: EventGridUnit[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) units.push(rr(categoryId, firstId + i, firstId + j))
  }
  return units
}

function assertGrid(
  assert: any,
  units: EventGridUnit[],
  numTerrains: number,
  res: EventGridPlacement
) {
  const slotByKey = new Map(res.placed.map((p) => [p.key, p.slotIndex]))

  // Aucune collision + plafond de terrains.
  const occupied = new Set<string>()
  const perSlot = new Map<number, number>()
  for (const p of res.placed) {
    const cell = `${p.slotIndex}#${p.terrainNumber}`
    assert.isFalse(occupied.has(cell), `collision sur ${cell}`)
    occupied.add(cell)
    assert.isAtLeast(p.terrainNumber, 1)
    assert.isAtMost(p.terrainNumber, numTerrains)
    perSlot.set(p.slotIndex, (perSlot.get(p.slotIndex) ?? 0) + 1)
  }
  for (const [, c] of perSlot) assert.isAtMost(c, numTerrains)

  // Toutes les unités placées exactement une fois.
  assert.equal(res.placed.length, units.length)

  // Repos : pas deux créneaux consécutifs pour une même équipe concrète.
  const slotsByTeam = new Map<number, number[]>()
  for (const u of units) {
    const slot = slotByKey.get(u.key)!
    for (const t of u.blockingTeams) {
      const arr = slotsByTeam.get(t) ?? []
      arr.push(slot)
      slotsByTeam.set(t, arr)
    }
  }
  for (const [team, slots] of slotsByTeam) {
    const sorted = [...slots].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      assert.notEqual(sorted[i] - sorted[i - 1], 1, `équipe ${team} joue deux créneaux de suite`)
    }
  }

  // Ordonnancement bracket : un match après TOUS ses nourriciers (strictement).
  for (const u of units) {
    const slot = slotByKey.get(u.key)!
    for (const p of u.predecessors) {
      assert.isAbove(slot, slotByKey.get(p)!, `${u.key} doit suivre son nourricier ${p}`)
    }
  }
}

test.group('scheduler · placeEventGrid (#32 — élimination directe)', () => {
  test('bracket 4 équipes : la finale suit les deux demies', ({ assert }) => {
    const units = [
      ko(2, 'sf-1', [10, 11], []),
      ko(2, 'sf-2', [12, 13], []),
      ko(2, 'final-1', [], ['2:sf-1', '2:sf-2']),
    ]
    for (const nt of [1, 2, 3]) {
      const res = placeEventGrid(units, nt)
      assertGrid(assert, units, nt, res)
    }
  })

  test('bracket 8 équipes (quarts → demies → finale) : chaîne de dépendances respectée', ({
    assert,
  }) => {
    const units: EventGridUnit[] = [
      ko(1, 'qf-1', [1, 2], []),
      ko(1, 'qf-2', [3, 4], []),
      ko(1, 'qf-3', [5, 6], []),
      ko(1, 'qf-4', [7, 8], []),
      ko(1, 'sf-1', [], ['1:qf-1', '1:qf-2']),
      ko(1, 'sf-2', [], ['1:qf-3', '1:qf-4']),
      ko(1, 'final-1', [], ['1:sf-1', '1:sf-2']),
    ]
    const res = placeEventGrid(units, 2)
    assertGrid(assert, units, 2, res)
  })

  test('mélange championnat + élimination directe sur le pool partagé', ({ assert }) => {
    const champ = rrCategory(1, 100, 4) // 6 matchs
    const knockout = [
      ko(2, 'sf-1', [10, 11], []),
      ko(2, 'sf-2', [12, 13], []),
      ko(2, 'final-1', [], ['2:sf-1', '2:sf-2']),
      ko(2, 'third-1', [], ['2:sf-1', '2:sf-2']),
    ]
    const units = [...champ, ...knockout]
    const res = placeEventGrid(units, 3)
    assertGrid(assert, units, 3, res)
    // Petite finale ET finale suivent bien les deux demies.
    const slotByKey = new Map(res.placed.map((p) => [p.key, p.slotIndex]))
    for (const dependent of ['2:final-1', '2:third-1']) {
      assert.isAbove(slotByKey.get(dependent)!, slotByKey.get('2:sf-1')!)
      assert.isAbove(slotByKey.get(dependent)!, slotByKey.get('2:sf-2')!)
    }
  })

  test('rejette entrées invalides', ({ assert }) => {
    assert.throws(() => placeEventGrid([], 2), SchedulerError)
    assert.throws(() => placeEventGrid([rr(1, 1, 2)], 0), SchedulerError)
    // Clé en double.
    assert.throws(() => placeEventGrid([rr(1, 1, 2), rr(1, 1, 2)], 2), SchedulerError)
    // Nourricier inconnu.
    assert.throws(() => placeEventGrid([ko(1, 'final-1', [], ['1:sf-1'])], 2), SchedulerError)
    // Équipe partagée entre deux catégories.
    assert.throws(() => placeEventGrid([rr(1, 1, 2), rr(2, 2, 3)], 2), SchedulerError)
  })
})
