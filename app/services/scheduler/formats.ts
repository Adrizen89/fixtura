import { generateSchedule } from './index.js'
import { generatePoolPairings, placePoolMatches, splitIntoPools, poolLabel } from './pools.js'
import { buildKnockout } from './knockout.js'
import { SchedulerError } from './errors.js'
import type { SchedulerParams, SlotSource, BracketMatch } from './types.js'

/**
 * Dispatcher de formats (sous-issue #46 de #31) — moteur **pur**, aucune
 * dépendance DB. Unifie championnat / poules / élimination directe / hybride en
 * une liste de matchs **placés** (créneau × terrain + horaire), avec participants
 * éventuellement **différés** (sources `match_winner` / `pool_rank`).
 *
 * Le vocabulaire (`stage`, `bracketRound`, `SlotSource`) est aligné sur les
 * colonnes `matches.*` de #42, pour un pont de persistance trivial.
 */

export type FormatKind = 'championship' | 'pools' | 'knockout' | 'hybrid' | 'swiss'

/** Paramètres propres au format (issus de `tournaments.format_config`). */
export interface FormatConfig {
  numPools?: number
  qualifiersPerPool?: number
  thirdPlace?: boolean
}

/** Un match placé, prêt à persister — participants concrets OU différés. */
export interface PhasedMatch {
  /** Identifiant abstrait dans l'arbre (knockout), pour résoudre les sources ; null sinon. */
  bracketId: string | null
  stage: 'main' | 'pool' | 'knockout'
  roundNumber: number
  groupLabel: string | null
  bracketRound: string | null
  bracketSlot: number | null
  slotIndex: number
  terrainNumber: number
  startsAtMinutes: number
  startTime: string
  /** Équipe connue, ou null si le participant est différé (résolu par la progression, #45). */
  homeTeamId: number | null
  awayTeamId: number | null
  /** Source différée du slot (null si l'équipe est connue). */
  home: SlotSource | null
  away: SlotSource | null
}

export interface PhasedSchedule {
  format: FormatKind
  matches: PhasedMatch[]
  slotsCount: number
  endsAtMinutes: number
}

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

/** Heure de début de chaque créneau (0..slotsCount-1), avec insertion de la pause déjeuner. */
function assignSlotTimes(slotsCount: number, params: SchedulerParams): number[] {
  const startMinutes = parseTimeToMinutes(params.startTime)
  const lunchStartMinutes = params.lunchStart ? parseTimeToMinutes(params.lunchStart) : null
  const lunchDurationMin = params.lunchDurationMin ?? 0
  const slotDuration = params.matchDurationMin + params.breakDurationMin

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
  return slotStart
}

/** Validations communes à tous les formats (les moteurs valident leurs spécificités). */
function baseValidate(params: SchedulerParams): void {
  if (new Set(params.teamIds).size !== params.teamIds.length) {
    throw new SchedulerError('Des équipes sont présentes en double.')
  }
  if (params.teamIds.length < 2) {
    throw new SchedulerError('Il faut au moins 2 équipes pour générer un planning.')
  }
  if (params.numTerrains < 1) {
    throw new SchedulerError('Il faut au moins 1 terrain.')
  }
  if (!Number.isInteger(params.matchDurationMin) || params.matchDurationMin < 1) {
    throw new SchedulerError("La durée d'un match doit être d'au moins 1 minute.")
  }
  if (!Number.isInteger(params.breakDurationMin) || params.breakDurationMin < 0) {
    throw new SchedulerError('La pause entre matchs ne peut pas être négative.')
  }
}

/**
 * Place un arbre d'élimination sur créneaux × terrains par **bandes topologiques**
 * (un tour occupe des créneaux strictement postérieurs à ceux de ses nourriciers).
 * Dans une bande, les matchs sont répartis par paquets de `numTerrains` créneaux.
 */
function placeBracketOntoGrid(
  matches: BracketMatch[],
  numTerrains: number,
  slotOffset: number
): { pos: Map<string, { slotIndex: number; terrainNumber: number }>; nextSlot: number } {
  const byBand = new Map<number, BracketMatch[]>()
  for (const m of matches) {
    const g = byBand.get(m.band) ?? []
    g.push(m)
    byBand.set(m.band, g)
  }
  const pos = new Map<string, { slotIndex: number; terrainNumber: number }>()
  let slotIndex = slotOffset
  for (const band of [...byBand.keys()].sort((a, b) => a - b)) {
    const group = byBand.get(band)!.sort((a, b) => a.slot - b.slot)
    for (let i = 0; i < group.length; i += numTerrains) {
      group.slice(i, i + numTerrains).forEach((m, t) => {
        pos.set(m.id, { slotIndex, terrainNumber: t + 1 })
      })
      slotIndex++
    }
  }
  return { pos, nextSlot: slotIndex }
}

const teamIdOf = (s: SlotSource): number | null => (s.type === 'team' ? s.teamId : null)
const deferredOf = (s: SlotSource): SlotSource | null => (s.type === 'team' ? null : s)

/** Mappe un match de bracket placé en `PhasedMatch`. */
function bracketMatchToPhased(
  m: BracketMatch,
  pos: { slotIndex: number; terrainNumber: number },
  slotStart: number[]
): PhasedMatch {
  return {
    bracketId: m.id,
    stage: 'knockout',
    roundNumber: m.round,
    groupLabel: null,
    bracketRound: m.bracketRound,
    bracketSlot: m.slot,
    slotIndex: pos.slotIndex,
    terrainNumber: pos.terrainNumber,
    startsAtMinutes: slotStart[pos.slotIndex],
    startTime: minutesToTime(slotStart[pos.slotIndex]),
    homeTeamId: teamIdOf(m.home),
    awayTeamId: teamIdOf(m.away),
    home: deferredOf(m.home),
    away: deferredOf(m.away),
  }
}

function championshipPhased(params: SchedulerParams): {
  matches: PhasedMatch[]
  slotsCount: number
} {
  const s = generateSchedule(params)
  const matches = s.matches.map<PhasedMatch>((m) => ({
    bracketId: null,
    stage: 'main',
    roundNumber: m.roundNumber,
    groupLabel: null,
    bracketRound: null,
    bracketSlot: null,
    slotIndex: m.slotIndex,
    terrainNumber: m.terrainNumber,
    startsAtMinutes: m.startsAtMinutes,
    startTime: m.startTime,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    home: null,
    away: null,
  }))
  return { matches, slotsCount: s.slotsCount }
}

function poolsPhased(
  params: SchedulerParams,
  numPools: number
): { matches: PhasedMatch[]; slotsCount: number } {
  const pairings = generatePoolPairings(params.teamIds, numPools)
  const { placed, slotsCount } = placePoolMatches(pairings, params.numTerrains)
  const slotStart = assignSlotTimes(slotsCount, params)
  const matches = placed.map<PhasedMatch>((p) => ({
    bracketId: null,
    stage: 'pool',
    roundNumber: p.roundNumber,
    groupLabel: p.groupLabel,
    bracketRound: null,
    bracketSlot: null,
    slotIndex: p.slotIndex,
    terrainNumber: p.terrainNumber,
    startsAtMinutes: slotStart[p.slotIndex],
    startTime: minutesToTime(slotStart[p.slotIndex]),
    homeTeamId: p.homeTeamId,
    awayTeamId: p.awayTeamId,
    home: null,
    away: null,
  }))
  return { matches, slotsCount }
}

function knockoutPhased(
  params: SchedulerParams,
  thirdPlace: boolean
): { matches: PhasedMatch[]; slotsCount: number } {
  const entrants: SlotSource[] = params.teamIds.map((id) => ({ type: 'team', teamId: id }))
  const bracket = buildKnockout({ entrants, thirdPlace })
  const { pos, nextSlot } = placeBracketOntoGrid(bracket.matches, params.numTerrains, 0)
  const slotStart = assignSlotTimes(nextSlot, params)
  const matches = bracket.matches.map((m) => bracketMatchToPhased(m, pos.get(m.id)!, slotStart))
  return { matches, slotsCount: nextSlot }
}

/** Ordre de série hybride : vainqueurs de poule d'abord, puis dauphins (→ « 1er A vs 2e B »). */
function hybridEntrants(numPools: number, qualifiersPerPool: number): SlotSource[] {
  const entrants: SlotSource[] = []
  for (let rank = 1; rank <= qualifiersPerPool; rank++) {
    for (let i = 0; i < numPools; i++) {
      entrants.push({ type: 'pool_rank', pool: poolLabel(i), rank })
    }
  }
  return entrants
}

function hybridPhased(
  params: SchedulerParams,
  numPools: number,
  qualifiersPerPool: number,
  thirdPlace: boolean
): { matches: PhasedMatch[]; slotsCount: number } {
  // Phase de poules d'abord (créneaux 0..P-1).
  const pairings = generatePoolPairings(params.teamIds, numPools)
  const pools = placePoolMatches(pairings, params.numTerrains)

  // Phase finale : qualifiés en sources de poule, placée APRÈS toutes les poules.
  const entrants = hybridEntrants(numPools, qualifiersPerPool)
  const bracket = buildKnockout({ entrants, thirdPlace })
  const { pos, nextSlot } = placeBracketOntoGrid(
    bracket.matches,
    params.numTerrains,
    pools.slotsCount
  )

  // Une seule passe d'horaires sur la grille combinée (cohérence de la pause déjeuner).
  const slotStart = assignSlotTimes(nextSlot, params)

  const poolMatches = pools.placed.map<PhasedMatch>((p) => ({
    bracketId: null,
    stage: 'pool',
    roundNumber: p.roundNumber,
    groupLabel: p.groupLabel,
    bracketRound: null,
    bracketSlot: null,
    slotIndex: p.slotIndex,
    terrainNumber: p.terrainNumber,
    startsAtMinutes: slotStart[p.slotIndex],
    startTime: minutesToTime(slotStart[p.slotIndex]),
    homeTeamId: p.homeTeamId,
    awayTeamId: p.awayTeamId,
    home: null,
    away: null,
  }))
  const koMatches = bracket.matches.map((m) => bracketMatchToPhased(m, pos.get(m.id)!, slotStart))

  return { matches: [...poolMatches, ...koMatches], slotsCount: nextSlot }
}

/**
 * Génère un planning **placé** pour n'importe quel format.
 * Le championnat délègue à `generateSchedule` (chemin v1 intact).
 *
 * @throws SchedulerError paramètres invalides / config de format manquante.
 * @throws InfeasibleScheduleError planning infaisable (propagé des moteurs).
 */
export function generatePhased(
  params: SchedulerParams,
  format: FormatKind,
  config: FormatConfig = {}
): PhasedSchedule {
  baseValidate(params)

  let built: { matches: PhasedMatch[]; slotsCount: number }

  if (format === 'championship') {
    built = championshipPhased(params)
  } else if (format === 'pools') {
    built = poolsPhased(params, requirePools(config, params))
  } else if (format === 'knockout') {
    built = knockoutPhased(params, config.thirdPlace ?? false)
  } else if (format === 'hybrid') {
    const numPools = requirePools(config, params)
    const qpp = config.qualifiersPerPool ?? 2
    validateQualifiers(params.teamIds, numPools, qpp)
    built = hybridPhased(params, numPools, qpp, config.thirdPlace ?? false)
  } else if (format === 'swiss') {
    // Le système suisse (#110) se génère **ronde par ronde** (les appariements
    // dépendent du classement) : il ne passe pas par ce planning figé d'avance,
    // mais par `app/services/swiss.ts`. Garde-fou défensif — jamais atteint.
    throw new SchedulerError('Le système suisse se génère ronde par ronde.')
  } else {
    throw new SchedulerError(`Format inconnu : « ${format} ».`)
  }

  const endsAtMinutes = built.matches.reduce(
    (max, m) => Math.max(max, m.startsAtMinutes + params.matchDurationMin),
    0
  )
  return { format, matches: built.matches, slotsCount: built.slotsCount, endsAtMinutes }
}

/** Récupère `numPools` de la config, en validant sa présence et sa cohérence. */
function requirePools(config: FormatConfig, params: SchedulerParams): number {
  const n = config.numPools
  if (!Number.isInteger(n) || (n as number) < 1) {
    throw new SchedulerError('Le nombre de poules (format_config.numPools) est requis (≥ 1).')
  }
  if ((n as number) > params.teamIds.length) {
    throw new SchedulerError(`Trop de poules (${n}) pour ${params.teamIds.length} équipe(s).`)
  }
  return n as number
}

/** Vérifie qu'on ne qualifie pas plus d'équipes qu'une poule n'en contient. */
function validateQualifiers(teamIds: number[], numPools: number, qualifiersPerPool: number): void {
  if (!Number.isInteger(qualifiersPerPool) || qualifiersPerPool < 1) {
    throw new SchedulerError('Le nombre de qualifiés par poule doit être ≥ 1.')
  }
  const smallestPool = Math.min(...splitIntoPools(teamIds, numPools).map((p) => p.length))
  if (qualifiersPerPool > smallestPool) {
    throw new SchedulerError(
      `Impossible de qualifier ${qualifiersPerPool} équipe(s) : la plus petite poule n'en compte que ${smallestPool}.`
    )
  }
  if (numPools * qualifiersPerPool < 2) {
    throw new SchedulerError('Il faut au moins 2 qualifiés pour une phase finale.')
  }
}
