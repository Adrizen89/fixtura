import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Match from '#models/match'
import type Event from '#models/event'
import type Tournament from '#models/tournament'
import {
  generateRoundRobin,
  generatePoolPairings,
  placeMultiCategory,
} from '#services/scheduler/index'
import type { CategoryInput, CategoryPairing } from '#services/scheduler/index'
import { assignSlotTimes, minutesToTime } from '#services/scheduler/timing'
import { SchedulerError } from '#services/scheduler/index'
import { viewFromSchedule, viewFromMatches } from '#services/planning'
import type { PlanningView } from '#services/planning'
import type { Schedule, ScheduledMatch } from '#services/scheduler/index'

/**
 * Pont entre le placement **inter-catégories** (pur, testé — `placeMultiCategory`)
 * et la base, pour les événements multi-catégories (#32). Génère et persiste le
 * planning de **toutes** les catégories d'un événement sur son **pool de terrains
 * partagé**, avec une passe d'horaires unique (rythme + pause déjeuner communs).
 *
 * Formats gérés au niveau événement : **championnat** et **poules** — les deux
 * formats « round-robin » où tous les participants sont connus dès la génération.
 * L'élimination directe / l'hybride (participants différés, ordonnancement par
 * bandes) restent gérés au niveau d'un tournoi autonome ; les mélanger sur une
 * grille partagée est hors périmètre de #32 et signalé par une erreur explicite.
 */

/** Ne garde que "HH:mm" d'une valeur `time` SQL qui peut arriver en "HH:mm:ss". */
function hhmm(value: string): string {
  return value.slice(0, 5)
}

/** Un match d'événement placé sur la grille partagée (prêt à persister / afficher). */
export interface EventScheduledMatch {
  categoryId: number
  roundNumber: number
  stage: 'main' | 'pool'
  groupLabel: string | null
  slotIndex: number
  terrainNumber: number
  startsAtMinutes: number
  startTime: string
  homeTeamId: number
  awayTeamId: number
}

export interface EventSchedule {
  matches: EventScheduledMatch[]
  /** Nombre total de créneaux (repos compris) sur la grille partagée. */
  slotsCount: number
  restSlots: number
  /** Fin du dernier match, en minutes depuis minuit. */
  endsAtMinutes: number
}

/**
 * Construit les appariements d'une catégorie selon son format.
 *  - `championship` → round-robin simple (stage `main`) ;
 *  - `pools`        → round-robin par poule (stage `pool`, étiquette de poule).
 *
 * @throws SchedulerError catégorie sans assez d'équipes, ou format non supporté
 *         au niveau événement (élimination directe / hybride).
 */
function categoryPairings(tournament: Tournament, teamIds: number[]): CategoryPairing[] {
  if (teamIds.length < 2) {
    throw new SchedulerError(
      `La catégorie « ${tournament.name} » doit avoir au moins 2 équipes pour être planifiée.`
    )
  }

  if (tournament.format === 'championship') {
    return generateRoundRobin(teamIds).map((p) => ({ ...p, stage: 'main', groupLabel: null }))
  }

  if (tournament.format === 'pools') {
    const numPools = tournament.formatConfig?.numPools
    if (!Number.isInteger(numPools) || (numPools as number) < 1) {
      throw new SchedulerError(
        `La catégorie « ${tournament.name} » (poules) doit préciser un nombre de poules.`
      )
    }
    return generatePoolPairings(teamIds, numPools as number).map((p) => ({
      roundNumber: p.roundNumber,
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
      stage: 'pool',
      groupLabel: p.groupLabel,
    }))
  }

  throw new SchedulerError(
    `Le format « ${tournament.format} » de la catégorie « ${tournament.name} » n'est pas pris en charge dans un événement multi-catégories (championnat et poules uniquement). Utilisez un tournoi autonome pour ce format.`
  )
}

/**
 * Génère le planning combiné d'un événement : place les matchs de toutes ses
 * catégories sur le pool de terrains partagé, puis attribue les horaires en une
 * passe (rythme + pause déjeuner de l'événement).
 *
 * Les catégories (tournois) doivent avoir leurs `teams` préchargées. Propage les
 * `SchedulerError` (paramètres invalides, format non supporté, infaisabilité).
 */
export function generateEventSchedule(event: Event, categories: Tournament[]): EventSchedule {
  if (categories.length === 0) {
    throw new SchedulerError('Ajoutez au moins une catégorie à cet événement.')
  }

  const inputs: CategoryInput[] = categories.map((tournament) => ({
    categoryId: tournament.id,
    pairings: categoryPairings(
      tournament,
      tournament.teams.map((t) => t.id)
    ),
  }))

  const { placed, slotsCount, restSlots } = placeMultiCategory(inputs, event.numTerrains)

  const slotStart = assignSlotTimes(slotsCount, {
    startTime: hhmm(event.startTime),
    matchDurationMin: event.matchDurationMin,
    breakDurationMin: event.breakDurationMin,
    lunchStart: event.lunchStart ? hhmm(event.lunchStart) : null,
    lunchDurationMin: event.lunchDurationMin,
  })

  const matches: EventScheduledMatch[] = placed
    .map((p) => ({
      categoryId: p.categoryId,
      roundNumber: p.roundNumber,
      stage: p.stage,
      groupLabel: p.groupLabel,
      slotIndex: p.slotIndex,
      terrainNumber: p.terrainNumber,
      startsAtMinutes: slotStart[p.slotIndex],
      startTime: minutesToTime(slotStart[p.slotIndex]),
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
    }))
    .sort(
      (a, b) =>
        a.slotIndex - b.slotIndex ||
        a.terrainNumber - b.terrainNumber ||
        a.categoryId - b.categoryId
    )

  const endsAtMinutes = matches.reduce(
    (max, m) => Math.max(max, m.startsAtMinutes + event.matchDurationMin),
    0
  )

  return { matches, slotsCount, restSlots, endsAtMinutes }
}

/**
 * Persiste le planning d'un événement (remplace tous les matchs de toutes ses
 * catégories, passe les statuts à `scheduled`), le tout dans une transaction pour
 * une régénération sûre.
 *
 * `scheduled_at` est construit en UTC (date de l'événement + offset du créneau) :
 * l'heure murale (HH:mm) reste stable en lecture, sans dérive de fuseau — même
 * convention que le planning mono-catégorie.
 */
export async function persistEventSchedule(
  event: Event,
  categories: Tournament[],
  schedule: EventSchedule
): Promise<void> {
  const { year, month, day } = event.eventDate
  const eventDay = DateTime.utc(year, month, day)

  const rows = schedule.matches.map((m) => ({
    tournamentId: m.categoryId,
    roundNumber: m.roundNumber,
    terrainNumber: m.terrainNumber,
    scheduledAt: eventDay.plus({ minutes: m.startsAtMinutes }),
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled' as const,
    forfeitTeamId: null,
    updatedByUserId: null,
    stage: m.stage,
    groupLabel: m.groupLabel,
  }))

  const categoryIds = categories.map((c) => c.id)

  await db.transaction(async (trx) => {
    await Match.query({ client: trx }).whereIn('tournament_id', categoryIds).delete()
    await Match.createMany(rows, { client: trx })

    for (const category of categories) {
      category.status = 'scheduled'
      category.useTransaction(trx)
      await category.save()
    }

    event.status = 'scheduled'
    event.useTransaction(trx)
    await event.save()
  })
}

/** Planning d'une catégorie au sein de la vue d'événement. */
export interface EventCategoryPlanning {
  categoryId: number
  name: string
  category: string
  format: string
  publicSlug: string
  planning: PlanningView
}

/** Vue du planning combiné d'un événement (aperçu ou persisté). */
export interface EventPlanningView {
  categories: EventCategoryPlanning[]
  numTerrains: number
  matchCount: number
  slotsCount: number
  startTime: string
  endTime: string
}

/**
 * Construit la vue d'aperçu d'un planning d'événement : une `PlanningView` par
 * catégorie (pour la navigation entre catégories, cf. critère #32), plus les
 * compteurs globaux de la grille partagée. Réutilise `viewFromSchedule` (testée)
 * en projetant les matchs de chaque catégorie en un `Schedule` mono-catégorie.
 */
export function viewFromEventSchedule(
  event: Event,
  categories: Tournament[],
  schedule: EventSchedule
): EventPlanningView {
  const byCategory = new Map<number, EventScheduledMatch[]>()
  for (const m of schedule.matches) {
    const bucket = byCategory.get(m.categoryId) ?? []
    bucket.push(m)
    byCategory.set(m.categoryId, bucket)
  }

  const categoryViews = categories.map<EventCategoryPlanning>((tournament) => {
    const names = new Map(tournament.teams.map((t) => [t.id, t.name]))
    const catMatches = byCategory.get(tournament.id) ?? []

    const scheduled: ScheduledMatch[] = catMatches.map((m) => ({
      roundNumber: m.roundNumber,
      slotIndex: m.slotIndex,
      terrainNumber: m.terrainNumber,
      startsAtMinutes: m.startsAtMinutes,
      startTime: m.startTime,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }))
    const endsAtMinutes = catMatches.reduce(
      (max, m) => Math.max(max, m.startsAtMinutes + event.matchDurationMin),
      0
    )
    const catSchedule: Schedule = {
      matches: scheduled,
      slotsCount: schedule.slotsCount,
      restSlots: 0,
      rounds: catMatches.reduce((max, m) => Math.max(max, m.roundNumber), 0),
      endsAtMinutes,
    }

    return {
      categoryId: tournament.id,
      name: tournament.name,
      category: tournament.category,
      format: tournament.format,
      publicSlug: tournament.publicSlug,
      planning: viewFromSchedule(catSchedule, names),
    }
  })

  return {
    categories: categoryViews,
    numTerrains: event.numTerrains,
    matchCount: schedule.matches.length,
    slotsCount: schedule.slotsCount,
    startTime: schedule.matches.length ? minutesToTime(schedule.matches[0].startsAtMinutes) : '—',
    endTime: schedule.matches.length ? minutesToTime(schedule.endsAtMinutes) : '—',
  }
}

/**
 * Construit la vue du planning **persisté** d'un événement (une `PlanningView` par
 * catégorie), à partir des matchs déjà en base. Retourne `null` si aucune catégorie
 * n'a encore de planning. Réutilise `viewFromMatches` (mono-catégorie) sur les
 * matchs de chaque catégorie, avec ses équipes préchargées.
 */
export async function buildPersistedEventPlanning(
  event: Event,
  categories: Tournament[]
): Promise<EventPlanningView | null> {
  const categoryIds = categories.map((c) => c.id)
  if (categoryIds.length === 0) return null

  const matches = await Match.query()
    .whereIn('tournament_id', categoryIds)
    .preload('homeTeam')
    .preload('awayTeam')
    .orderBy('scheduled_at')
    .orderBy('terrain_number')

  if (matches.length === 0) return null

  const byCategory = new Map<number, Match[]>()
  for (const m of matches) {
    const bucket = byCategory.get(m.tournamentId) ?? []
    bucket.push(m)
    byCategory.set(m.tournamentId, bucket)
  }

  const categoryViews: EventCategoryPlanning[] = []
  for (const tournament of categories) {
    const catMatches = byCategory.get(tournament.id) ?? []
    if (catMatches.length === 0) continue
    categoryViews.push({
      categoryId: tournament.id,
      name: tournament.name,
      category: tournament.category,
      format: tournament.format,
      publicSlug: tournament.publicSlug,
      planning: viewFromMatches(catMatches, event.matchDurationMin),
    })
  }

  const starts = matches.map((m) => m.scheduledAt.toUTC())
  const startMin = Math.min(...starts.map((d) => d.hour * 60 + d.minute))
  const endMin = Math.max(...starts.map((d) => d.hour * 60 + d.minute)) + event.matchDurationMin

  return {
    categories: categoryViews,
    numTerrains: event.numTerrains,
    matchCount: matches.length,
    slotsCount: new Set(starts.map((d) => d.toFormat('HH:mm'))).size,
    startTime: minutesToTime(startMin),
    endTime: minutesToTime(endMin),
  }
}
