import { generateRoundRobin } from './round_robin.js'
import { placeMatches } from './placement.js'
import { SchedulerError } from './errors.js'
import type { SchedulerParams, Schedule, ScheduledMatch } from './types.js'

export { SchedulerError, InfeasibleScheduleError } from './errors.js'
export { generateRoundRobin } from './round_robin.js'
export { buildKnockout } from './knockout.js'
export type { SchedulerParams, Schedule, ScheduledMatch, Pairing } from './types.js'
export type { SlotSource, BracketMatch, Bracket, KnockoutParams } from './types.js'

// Phase de poules (formats v2 — cf. issue #43 / #31). Moteur pur, réutilise le
// round-robin et le solveur de placement existants.
export { splitIntoPools, generatePoolPairings, placePoolMatches, poolLabel } from './pools.js'
export type { PoolPairing, PlacedPoolMatch, PlacedPoolsResult } from './pools.js'

// Placement inter-catégories sur un pool de terrains partagé (événements v2 — #32) :
// solveur de grille unifié (round-robin + élimination directe mélangés).
export { placeEventGrid } from './event_grid.js'
export type { EventGridUnit, PlacedEventGridUnit, EventGridPlacement } from './event_grid.js'

// Système suisse (#110) : moteur d'appariement pur, une ronde à la fois.
export { pairSwissRound, defaultSwissRounds, pairKey } from './swiss.js'
export type { SwissPairing, SwissRound } from './swiss.js'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseTimeToMinutes(t: string): number {
  const m = TIME_REGEX.exec(t)
  if (!m) throw new SchedulerError(`Heure invalide : « ${t} » (format attendu HH:mm).`)
  return Number(m[1]) * 60 + Number(m[2])
}

function minutesToTime(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const mm = total % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * Génère le planning complet d'un tournoi (championnat / round-robin simple).
 *
 * Étapes :
 *  1. Appariements round-robin (chaque équipe rencontre chaque autre une fois).
 *  2. Placement glouton sur créneaux × terrains (repos entre deux matchs d'une
 *     même équipe garanti).
 *  3. Affectation des horaires (durée match + pause, insertion pause déjeuner).
 *
 * @throws SchedulerError si les paramètres sont invalides.
 */
export function generateSchedule(params: SchedulerParams): Schedule {
  const { teamIds, numTerrains, matchDurationMin, breakDurationMin } = params
  const lunchDurationMin = params.lunchDurationMin ?? 0

  // --- Validations ---
  if (new Set(teamIds).size !== teamIds.length) {
    throw new SchedulerError('Des équipes sont présentes en double.')
  }
  if (teamIds.length < 2) {
    throw new SchedulerError('Il faut au moins 2 équipes pour générer un planning.')
  }
  if (numTerrains < 1) {
    throw new SchedulerError('Il faut au moins 1 terrain.')
  }
  if (!Number.isInteger(matchDurationMin) || matchDurationMin < 1) {
    throw new SchedulerError("La durée d'un match doit être d'au moins 1 minute.")
  }
  if (!Number.isInteger(breakDurationMin) || breakDurationMin < 0) {
    throw new SchedulerError('La pause entre matchs ne peut pas être négative.')
  }
  if (lunchDurationMin < 0) {
    throw new SchedulerError('La durée de la pause déjeuner ne peut pas être négative.')
  }

  const startMinutes = parseTimeToMinutes(params.startTime)
  const lunchStartMinutes = params.lunchStart ? parseTimeToMinutes(params.lunchStart) : null

  // --- 1. Appariements ---
  const pairings = generateRoundRobin(teamIds)
  const rounds = pairings.reduce((max, p) => Math.max(max, p.roundNumber), 0)

  // --- 2. Placement ---
  const { placed, slotsCount, restSlots } = placeMatches(pairings, numTerrains)

  // --- 3. Horaires ---
  const slotDuration = matchDurationMin + breakDurationMin
  const slotStart: number[] = new Array(slotsCount)
  let clock = startMinutes
  let lunchInserted = false

  for (let s = 0; s < slotsCount; s++) {
    if (
      lunchStartMinutes !== null &&
      lunchDurationMin > 0 &&
      !lunchInserted &&
      lunchStartMinutes >= startMinutes &&
      clock >= lunchStartMinutes
    ) {
      clock += lunchDurationMin
      lunchInserted = true
    }
    slotStart[s] = clock
    clock += slotDuration
  }

  const matches: ScheduledMatch[] = placed
    .map((p) => ({
      roundNumber: p.roundNumber,
      slotIndex: p.slotIndex,
      terrainNumber: p.terrainNumber,
      startsAtMinutes: slotStart[p.slotIndex],
      startTime: minutesToTime(slotStart[p.slotIndex]),
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
    }))
    .sort((a, b) => a.slotIndex - b.slotIndex || a.terrainNumber - b.terrainNumber)

  const endsAtMinutes = matches.reduce(
    (max, m) => Math.max(max, m.startsAtMinutes + matchDurationMin),
    startMinutes
  )

  return { matches, slotsCount, restSlots, rounds, endsAtMinutes }
}
