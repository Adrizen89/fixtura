import { generateRoundRobin } from './round_robin.js'
import { placeMatches, type PlacedMatch } from './placement.js'
import { SchedulerError } from './errors.js'
import type { Pairing } from './types.js'

/**
 * Phase de poules — moteur **pur** (aucune dépendance DB), cf. CLAUDE.md §6 ·
 * issue #43 (sous-issue de #31 : formats v2 poules / élimination / hybride).
 *
 * On réutilise tel quel le round-robin (`generateRoundRobin`) et le solveur de
 * placement (`placeMatches`) : les équipes étant **disjointes entre poules**, la
 * contrainte « pas deux créneaux consécutifs » est déjà garantie par le solveur,
 * sans traitement spécifique.
 */

/** Un appariement de poule : un appariement round-robin + son étiquette de poule. */
export interface PoolPairing extends Pairing {
  /** Étiquette de la poule (« A », « B », …). */
  groupLabel: string
}

/** Un match de poule placé (créneau × terrain) — porte l'étiquette de poule. */
export interface PlacedPoolMatch extends PlacedMatch {
  groupLabel: string
}

/** Résultat du placement de toutes les poules. */
export interface PlacedPoolsResult {
  placed: PlacedPoolMatch[]
  /** Nombre total de créneaux (repos compris). */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé). */
  restSlots: number
}

/** Étiquette d'une poule depuis son index 0-based : A, B, … Z, puis P27, P28… */
export function poolLabel(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `P${index + 1}`
}

/**
 * Répartit les équipes en `numPools` poules par distribution **serpentin** (snake
 * seeding) : attribution poule par poule en alternant le sens à chaque tour. Le
 * résultat est équilibré (tailles à ±1) et les têtes de série sont réparties.
 *
 * Exemple (10 équipes, 3 poules) → tailles [3, 3, 4].
 *
 * @throws SchedulerError si les paramètres sont invalides (doublons, moins de
 *         2 équipes, moins d'1 poule, ou plus de poules que d'équipes).
 */
export function splitIntoPools(teamIds: number[], numPools: number): number[][] {
  if (new Set(teamIds).size !== teamIds.length) {
    throw new SchedulerError('Des équipes sont présentes en double.')
  }
  if (teamIds.length < 2) {
    throw new SchedulerError('Il faut au moins 2 équipes pour former des poules.')
  }
  if (!Number.isInteger(numPools) || numPools < 1) {
    throw new SchedulerError('Il faut au moins 1 poule.')
  }
  if (numPools > teamIds.length) {
    throw new SchedulerError(`Trop de poules (${numPools}) pour ${teamIds.length} équipe(s).`)
  }

  const pools: number[][] = Array.from({ length: numPools }, () => [])
  teamIds.forEach((id, i) => {
    const round = Math.floor(i / numPools)
    const pos = i % numPools
    // Sens alterné : tours pairs de gauche à droite, tours impairs de droite à gauche.
    const poolIdx = round % 2 === 0 ? pos : numPools - 1 - pos
    pools[poolIdx].push(id)
  })
  return pools
}

/**
 * Appariements de toutes les poules : round-robin simple **par poule** (chaque
 * équipe rencontre les autres de sa poule une fois), chaque match étiqueté de sa
 * poule (`groupLabel`). Aucune rencontre inter-poules.
 */
export function generatePoolPairings(teamIds: number[], numPools: number): PoolPairing[] {
  const pools = splitIntoPools(teamIds, numPools)
  const pairings: PoolPairing[] = []
  pools.forEach((poolTeams, idx) => {
    const groupLabel = poolLabel(idx)
    for (const pairing of generateRoundRobin(poolTeams)) {
      pairings.push({ ...pairing, groupLabel })
    }
  })
  return pairings
}

/**
 * Place tous les matchs de poules sur créneaux × terrains via le solveur existant
 * `placeMatches` (contrainte de repos garantie). L'étiquette de poule est
 * ré-attachée à chaque match placé via la paire (domicile, extérieur) — unique,
 * puisque les équipes sont disjointes entre poules.
 */
export function placePoolMatches(pairings: PoolPairing[], numTerrains: number): PlacedPoolsResult {
  const labelByPair = new Map<string, string>()
  for (const p of pairings) {
    labelByPair.set(`${p.homeTeamId}-${p.awayTeamId}`, p.groupLabel)
  }

  const { placed, slotsCount, restSlots } = placeMatches(pairings, numTerrains)

  return {
    placed: placed.map((m) => ({
      ...m,
      groupLabel: labelByPair.get(`${m.homeTeamId}-${m.awayTeamId}`) ?? '',
    })),
    slotsCount,
    restSlots,
  }
}
