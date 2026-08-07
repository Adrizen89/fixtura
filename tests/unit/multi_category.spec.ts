import { test } from '@japa/runner'
import {
  placeMultiCategory,
  generateRoundRobin,
  generatePoolPairings,
  SchedulerError,
} from '#services/scheduler/index'
import type {
  CategoryInput,
  CategoryPairing,
  MultiCategoryPlacement,
} from '#services/scheduler/index'

/**
 * Placement inter-catégories sur un pool de terrains partagé (#32).
 *
 * On vérifie les contraintes dures d'un événement multi-catégories :
 *  - aucune collision (créneau × terrain) TOUTES catégories confondues ;
 *  - au plus `numTerrains` matchs par créneau sur le pool partagé ;
 *  - jamais deux matchs d'une même équipe sur le même créneau ;
 *  - aucune équipe ne joue deux créneaux consécutifs (par catégorie) ;
 *  - tous les appariements de chaque catégorie placés exactement une fois.
 */

/** Une catégorie « championnat » à partir d'un intervalle d'identifiants d'équipes. */
function championship(categoryId: number, firstId: number, n: number): CategoryInput {
  const teamIds = Array.from({ length: n }, (_, i) => firstId + i)
  const pairings: CategoryPairing[] = generateRoundRobin(teamIds).map((p) => ({
    ...p,
    stage: 'main',
    groupLabel: null,
  }))
  return { categoryId, pairings }
}

/** Vérifie l'intégralité des contraintes dures sur un placement combiné. */
function assertValid(
  assert: any,
  inputs: CategoryInput[],
  numTerrains: number,
  res: MultiCategoryPlacement
) {
  // --- Aucune collision (créneau × terrain), plafond de terrains respecté ---
  const occupied = new Set<string>()
  const perSlot = new Map<number, number>()
  for (const m of res.placed) {
    const cell = `${m.slotIndex}#${m.terrainNumber}`
    assert.isFalse(occupied.has(cell), `collision de terrain sur ${cell}`)
    occupied.add(cell)
    assert.isAtLeast(m.terrainNumber, 1)
    assert.isAtMost(m.terrainNumber, numTerrains)
    perSlot.set(m.slotIndex, (perSlot.get(m.slotIndex) ?? 0) + 1)
  }
  for (const [, count] of perSlot)
    assert.isAtMost(count, numTerrains, 'trop de matchs sur un créneau')

  // --- Jamais deux matchs d'une même équipe sur un même créneau ---
  const teamSlot = new Set<string>()
  for (const m of res.placed) {
    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      const k = `${teamId}@${m.slotIndex}`
      assert.isFalse(teamSlot.has(k), `équipe ${teamId} deux fois sur le créneau ${m.slotIndex}`)
      teamSlot.add(k)
    }
  }

  // --- Aucune équipe ne joue deux créneaux consécutifs ---
  const slotsByTeam = new Map<number, number[]>()
  for (const m of res.placed) {
    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      const arr = slotsByTeam.get(teamId) ?? []
      arr.push(m.slotIndex)
      slotsByTeam.set(teamId, arr)
    }
  }
  for (const [teamId, slots] of slotsByTeam) {
    const sorted = [...slots].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      assert.notEqual(sorted[i] - sorted[i - 1], 1, `équipe ${teamId} joue deux créneaux de suite`)
    }
  }

  // --- Tous les appariements de chaque catégorie placés exactement une fois ---
  const totalPairings = inputs.reduce((sum, c) => sum + c.pairings.length, 0)
  assert.equal(res.placed.length, totalPairings, 'nombre total de matchs placés')
  for (const cat of inputs) {
    const placedForCat = res.placed.filter((m) => m.categoryId === cat.categoryId)
    assert.equal(placedForCat.length, cat.pairings.length, `catégorie ${cat.categoryId}`)
    const expected = new Set(cat.pairings.map((p) => `${p.homeTeamId}-${p.awayTeamId}`))
    for (const m of placedForCat) {
      assert.isTrue(expected.has(`${m.homeTeamId}-${m.awayTeamId}`))
    }
  }
}

test.group('scheduler · placeMultiCategory (#32)', () => {
  test('trois catégories sur 3 terrains partagés — aucune collision', ({ assert }) => {
    const inputs = [
      championship(1, 100, 4), // U9 : 6 matchs
      championship(2, 200, 5), // U11 : 10 matchs
      championship(3, 300, 4), // U13 : 6 matchs
    ]
    const res = placeMultiCategory(inputs, 3)
    assertValid(assert, inputs, 3, res)
  })

  test('un seul terrain partagé reste faisable (jamais de collision)', ({ assert }) => {
    const inputs = [championship(1, 10, 4), championship(2, 20, 4)]
    const res = placeMultiCategory(inputs, 1)
    assertValid(assert, inputs, 1, res)
    // 1 terrain → au plus 1 match par créneau.
    const perSlot = new Map<number, number>()
    for (const m of res.placed) perSlot.set(m.slotIndex, (perSlot.get(m.slotIndex) ?? 0) + 1)
    for (const [, c] of perSlot) assert.equal(c, 1)
  })

  test('catégories de tailles impaires mélangées', ({ assert }) => {
    const inputs = [championship(1, 1, 3), championship(2, 50, 6), championship(3, 90, 5)]
    const res = placeMultiCategory(inputs, 4)
    assertValid(assert, inputs, 4, res)
  })

  test('mélange championnat + poules sur le pool partagé', ({ assert }) => {
    const champ = championship(1, 100, 4)
    const poolPairings: CategoryPairing[] = generatePoolPairings(
      [200, 201, 202, 203, 204, 205],
      2
    ).map((p) => ({
      roundNumber: p.roundNumber,
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
      stage: 'pool',
      groupLabel: p.groupLabel,
    }))
    const inputs = [champ, { categoryId: 2, pairings: poolPairings }]
    const res = placeMultiCategory(inputs, 2)
    assertValid(assert, inputs, 2, res)
    // Les étiquettes de poule sont préservées jusqu'au placement.
    const poolPlaced = res.placed.filter((m) => m.categoryId === 2)
    assert.isTrue(poolPlaced.every((m) => m.groupLabel === 'A' || m.groupLabel === 'B'))
  })

  test('rejette une équipe présente dans deux catégories', ({ assert }) => {
    const a = championship(1, 1, 4)
    const b = championship(2, 3, 4) // chevauche les ids 3,4 avec la catégorie 1
    assert.throws(() => placeMultiCategory([a, b], 2), SchedulerError)
  })

  test('rejette une liste de catégories vide et un pool invalide', ({ assert }) => {
    assert.throws(() => placeMultiCategory([], 3), SchedulerError)
    assert.throws(() => placeMultiCategory([championship(1, 1, 4)], 0), SchedulerError)
  })
})
