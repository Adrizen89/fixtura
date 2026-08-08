import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Match from '#models/match'
import type { MatchStatus } from '#models/match'
import type Tournament from '#models/tournament'
import { computeStandings } from '#services/standings'
import { pairSwissRound, defaultSwissRounds, pairKey } from '#services/scheduler/swiss'
import type { SwissRound } from '#services/scheduler/swiss'
import { parseTimeToMinutes, minutesToTime } from '#services/scheduler/timing'
import type { PlanningView, PlanningMatchView } from '#services/planning'

/**
 * Système suisse — **couche DB** (issue #110). Le moteur d'appariement pur vit dans
 * `scheduler/swiss.ts` ; ce module fait le pont avec la base : générer/persister la
 * **ronde 1** au moment du planning, puis générer **automatiquement** la ronde
 * suivante à la saisie des scores, une fois la ronde en cours terminée.
 *
 * Choix d'intégration (cf. cadrage #110) :
 *  - Nombre de rondes : `format_config.swissRounds` si fixé, sinon ⌈log₂(N)⌉.
 *  - Génération **automatique** ronde par ronde (pas de bouton) : la ronde N+1 naît
 *    dans la transaction de saisie du dernier score de la ronde N (cf.
 *    `ResultsController.progress`). On ne **régénère jamais** une ronde déjà créée
 *    (une correction de score met à jour le classement sans casser les appariements
 *    aval — même prudence que la progression des brackets).
 *  - Bye (N impair) : matérialisé en **match réglé à un seul côté** (victoire
 *    d'office), compté au classement via `computeStandings(..., byes)`.
 */

/** Un match placé d'une ronde suisse (bye = `awayTeamId` null). */
interface PlacedSwissMatch {
  terrainNumber: number
  startMinutes: number
  homeTeamId: number
  awayTeamId: number | null
  isBye: boolean
}

/** Nombre de rondes du tournoi : config si fixée (> 0), sinon ⌈log₂(N)⌉. */
export function swissRoundsFor(tournament: Tournament): number {
  const configured = tournament.formatConfig?.swissRounds
  if (typeof configured === 'number' && configured > 0) return configured
  return defaultSwissRounds(tournament.teams.length)
}

/** Ordre de tête de série (ronde 1) : par id (ordre d'ajout), déterministe. */
function seedOrder(tournament: Tournament): number[] {
  return [...tournament.teams].map((t) => t.id).sort((a, b) => a - b)
}

/** Durée d'un créneau (match + pause), en minutes. */
function slotDurationOf(tournament: Tournament): number {
  return tournament.matchDurationMin + tournament.breakDurationMin
}

/**
 * Place une ronde sur créneaux × terrains à partir de `startMinutes`. Chaque équipe
 * ne jouant qu'une fois par ronde, la contrainte de repos est trivialement
 * respectée : on remplit simplement les terrains, `numTerrains` matchs par créneau.
 * Le bye (le cas échéant) est placé au début de la ronde, hors terrain.
 */
function placeRound(
  round: SwissRound,
  numTerrains: number,
  startMinutes: number,
  slotDuration: number
): PlacedSwissMatch[] {
  const placed: PlacedSwissMatch[] = round.pairings.map((p, i) => {
    const slot = Math.floor(i / numTerrains)
    return {
      terrainNumber: (i % numTerrains) + 1,
      startMinutes: startMinutes + slot * slotDuration,
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
      isBye: false,
    }
  })

  if (round.byeTeamId !== null) {
    placed.push({
      terrainNumber: 0,
      startMinutes,
      homeTeamId: round.byeTeamId,
      awayTeamId: null,
      isBye: true,
    })
  }

  return placed
}

/** Insère les lignes de match d'une ronde ; renvoie les ids créés. */
async function insertRound(
  tournament: Tournament,
  roundNumber: number,
  placed: PlacedSwissMatch[],
  trx: TransactionClientContract
): Promise<number[]> {
  const { year, month, day } = tournament.eventDate
  const eventDay = DateTime.utc(year, month, day)

  const rows = placed.map((p) => ({
    tournamentId: tournament.id,
    roundNumber,
    terrainNumber: p.terrainNumber,
    scheduledAt: eventDay.plus({ minutes: p.startMinutes }),
    homeTeamId: p.homeTeamId,
    awayTeamId: p.awayTeamId,
    homeScore: null,
    awayScore: null,
    // Un bye est réglé d'office (victoire sans match) ; les duels sont à jouer.
    status: (p.isBye ? 'finished' : 'scheduled') as MatchStatus,
    stage: 'swiss' as const,
  }))

  const created = await Match.createMany(rows, { client: trx })
  return created.map((m) => m.id)
}

/** Vrai match joué (deux équipes + deux scores connus). */
function isPlayed(m: Match): boolean {
  return (
    m.homeTeamId !== null && m.awayTeamId !== null && m.homeScore !== null && m.awayScore !== null
  )
}

/** Byes déjà accordés (teamId → nombre), à partir des lignes de match. */
function byesFrom(matches: Match[]): Map<number, number> {
  const byes = new Map<number, number>()
  for (const m of matches) {
    if (
      m.homeTeamId !== null &&
      m.awayTeamId === null &&
      (m.status === 'finished' || m.status === 'forfeit')
    ) {
      byes.set(m.homeTeamId, (byes.get(m.homeTeamId) ?? 0) + 1)
    }
  }
  return byes
}

/** Construit une `PlanningView` (aperçu) à partir de matchs placés. */
function placedToView(
  placed: PlacedSwissMatch[],
  names: Map<number, string>,
  matchDurationMin: number
): PlanningView {
  const bySlot = new Map<number, PlanningMatchView[]>()
  for (const p of placed) {
    const bucket = bySlot.get(p.startMinutes) ?? []
    bucket.push({
      terrainNumber: p.terrainNumber,
      homeTeam: names.get(p.homeTeamId) ?? `#${p.homeTeamId}`,
      awayTeam: p.isBye ? 'Exempt' : (names.get(p.awayTeamId!) ?? `#${p.awayTeamId}`),
      homeScore: null,
      awayScore: null,
      status: p.isBye ? 'finished' : 'scheduled',
    })
    bySlot.set(p.startMinutes, bucket)
  }

  const slots = [...bySlot.keys()]
    .sort((a, b) => a - b)
    .map((mins) => ({
      time: minutesToTime(mins),
      matches: bySlot.get(mins)!.sort((a, b) => a.terrainNumber - b.terrainNumber),
    }))

  const starts = placed.map((p) => p.startMinutes)
  const startMin = Math.min(...starts)
  const endMin = Math.max(...starts) + matchDurationMin
  const realMatches = placed.filter((p) => !p.isBye).length

  return {
    slots,
    matchCount: realMatches,
    roundsCount: 1,
    slotsCount: slots.length,
    startTime: minutesToTime(startMin),
    endTime: minutesToTime(endMin),
  }
}

/** Aperçu de la ronde 1 (sans persistance), pour l'écran de génération du planning. */
export function previewInitialRound(tournament: Tournament): PlanningView {
  const round = pairSwissRound(seedOrder(tournament), new Set(), new Set())
  const placed = placeRound(
    round,
    tournament.numTerrains,
    parseTimeToMinutes(tournament.startTime.slice(0, 5)),
    slotDurationOf(tournament)
  )
  const names = new Map(tournament.teams.map((t) => [t.id, t.name]))
  return placedToView(placed, names, tournament.matchDurationMin)
}

/**
 * Génère et persiste la **ronde 1** (remplace tout planning existant), puis passe le
 * tournoi en `scheduled`. Les rondes suivantes naîtront à la saisie des scores.
 */
export async function persistInitialRound(tournament: Tournament): Promise<void> {
  const round = pairSwissRound(seedOrder(tournament), new Set(), new Set())
  const placed = placeRound(
    round,
    tournament.numTerrains,
    parseTimeToMinutes(tournament.startTime.slice(0, 5)),
    slotDurationOf(tournament)
  )

  await db.transaction(async (trx) => {
    await Match.query({ client: trx }).where('tournament_id', tournament.id).delete()
    await insertRound(tournament, 1, placed, trx)
    tournament.status = 'scheduled'
    tournament.useTransaction(trx)
    await tournament.save()
  })
}

/**
 * Fait avancer un tournoi suisse : si la **dernière ronde** est entièrement réglée
 * et qu'il reste des rondes à jouer, génère la ronde suivante à partir du classement
 * courant (proximité de score, sans rematch, bye tournant) et l'insère. No-op sinon
 * (ronde en cours, tournoi terminé, ou ronde suivante déjà créée). Renvoie les ids
 * des matchs créés. Doit tourner dans la transaction de saisie du score.
 */
export async function advanceSwiss(
  tournament: Tournament,
  trx: TransactionClientContract
): Promise<number[]> {
  const matches = await Match.query({ client: trx })
    .where('tournament_id', tournament.id)
    .where('stage', 'swiss')

  if (matches.length === 0) return []

  const maxRound = Math.max(...matches.map((m) => m.roundNumber))
  const currentRound = matches.filter((m) => m.roundNumber === maxRound)
  const allSettled = currentRound.every((m) => m.status === 'finished' || m.status === 'forfeit')
  if (!allSettled) return []

  if (maxRound >= swissRoundsFor(tournament)) return []

  // Classement courant → ordre des équipes (meilleure d'abord).
  const teams = tournament.teams.map((t) => ({ id: t.id, name: t.name }))
  const played = matches.filter(isPlayed).map((m) => ({
    homeTeamId: m.homeTeamId!,
    awayTeamId: m.awayTeamId!,
    homeScore: m.homeScore!,
    awayScore: m.awayScore!,
  }))
  const byes = byesFrom(matches)
  const standings = computeStandings(teams, played, tournament.scoring, byes)
  const ordered = standings.map((r) => r.teamId)

  const playedPairs = new Set(played.map((m) => pairKey(m.homeTeamId, m.awayTeamId)))
  const byedTeams = new Set(byes.keys())
  const next = pairSwissRound(ordered, playedPairs, byedTeams)

  // La ronde suivante démarre un créneau après le dernier match placé.
  const { year, month, day } = tournament.eventDate
  const eventDay = DateTime.utc(year, month, day)
  const slotDuration = slotDurationOf(tournament)
  const lastStart = Math.max(
    ...matches.map((m) => Math.round(m.scheduledAt.toUTC().diff(eventDay, 'minutes').minutes))
  )
  const placed = placeRound(next, tournament.numTerrains, lastStart + slotDuration, slotDuration)

  return insertRound(tournament, maxRound + 1, placed, trx)
}
