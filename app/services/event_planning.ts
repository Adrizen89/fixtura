import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Match from '#models/match'
import type Event from '#models/event'
import type Tournament from '#models/tournament'
import {
  generateRoundRobin,
  generatePoolPairings,
  buildKnockout,
  placeEventGrid,
} from '#services/scheduler/index'
import type { EventGridUnit, SlotSource, BracketMatch } from '#services/scheduler/index'
import { assignSlotTimes, minutesToTime } from '#services/scheduler/timing'
import { SchedulerError } from '#services/scheduler/index'
import { viewFromMatches, viewFromPhased } from '#services/planning'
import type { PlanningView } from '#services/planning'
import type { PhasedMatch, PhasedSchedule } from '#services/scheduler/formats'

/**
 * Pont entre le solveur de grille **unifié** (pur, testé — `placeEventGrid`) et la
 * base, pour les événements multi-catégories (#32). Génère et persiste le planning
 * de **toutes** les catégories d'un événement sur son **pool de terrains partagé**,
 * avec une passe d'horaires unique (rythme + pause déjeuner communs).
 *
 * Formats gérés au niveau événement : **championnat**, **poules** (round-robin, tous
 * les participants connus) **et élimination directe** (bracket à participants
 * différés, ordonnancé par dépendances). L'**hybride** (poules → phase finale, deux
 * phases enchaînées) reste géré au niveau d'un tournoi autonome ; une erreur
 * explicite le signale.
 */

/** Ne garde que "HH:mm" d'une valeur `time` SQL qui peut arriver en "HH:mm:ss". */
function hhmm(value: string): string {
  return value.slice(0, 5)
}

const teamIdOf = (s: SlotSource): number | null => (s.type === 'team' ? s.teamId : null)
const deferredOf = (s: SlotSource): SlotSource | null => (s.type === 'team' ? null : s)

/** Un match d'événement placé sur la grille partagée (prêt à persister / afficher). */
export interface EventScheduledMatch {
  categoryId: number
  /** Identifiant abstrait namespacé (`${categoryId}:${bracketId}`) en bracket ; null sinon. */
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
  homeTeamId: number | null
  awayTeamId: number | null
  /** Source différée du slot (null si l'équipe est connue). */
  home: SlotSource | null
  away: SlotSource | null
}

export interface EventSchedule {
  matches: EventScheduledMatch[]
  /** Nombre total de créneaux (repos compris) sur la grille partagée. */
  slotsCount: number
  restSlots: number
  /** Fin du dernier match, en minutes depuis minuit. */
  endsAtMinutes: number
}

/** Descriptif d'un match d'une catégorie AVANT placement (participants éventuellement différés). */
interface MatchDescriptor {
  categoryId: number
  key: string
  bracketId: string | null
  stage: 'main' | 'pool' | 'knockout'
  roundNumber: number
  groupLabel: string | null
  bracketRound: string | null
  bracketSlot: number | null
  homeTeamId: number | null
  awayTeamId: number | null
  home: SlotSource | null
  away: SlotSource | null
}

/** Namespace un `matchId` de source de bracket par catégorie (unicité globale sur la grille). */
function namespaceSource(categoryId: number, s: SlotSource): SlotSource {
  if (s.type === 'match_winner' || s.type === 'match_loser') {
    return { type: s.type, matchId: `${categoryId}:${s.matchId}` }
  }
  return s
}

/**
 * Construit les matchs (descripteurs + unités de placement) d'une catégorie selon
 * son format :
 *  - `championship` → round-robin simple (stage `main`) ;
 *  - `pools`        → round-robin par poule (stage `pool`, étiquette de poule) ;
 *  - `knockout`     → arbre d'élimination directe (stage `knockout`, participants
 *    différés, nourriciers → dépendances d'ordonnancement).
 *
 * @throws SchedulerError catégorie sans assez d'équipes, ou format non supporté au
 *         niveau événement (hybride).
 */
function categoryMatches(
  tournament: Tournament,
  teamIds: number[]
): { descriptors: MatchDescriptor[]; units: EventGridUnit[] } {
  if (teamIds.length < 2) {
    throw new SchedulerError(
      `La catégorie « ${tournament.name} » doit avoir au moins 2 équipes pour être planifiée.`
    )
  }
  const catId = tournament.id
  const descriptors: MatchDescriptor[] = []
  const units: EventGridUnit[] = []

  const pushRoundRobin = (
    stage: 'main' | 'pool',
    pairing: { roundNumber: number; homeTeamId: number; awayTeamId: number; groupLabel?: string }
  ) => {
    const key = `${catId}:${stage}:${pairing.homeTeamId}-${pairing.awayTeamId}`
    descriptors.push({
      categoryId: catId,
      key,
      bracketId: null,
      stage,
      roundNumber: pairing.roundNumber,
      groupLabel: pairing.groupLabel ?? null,
      bracketRound: null,
      bracketSlot: null,
      homeTeamId: pairing.homeTeamId,
      awayTeamId: pairing.awayTeamId,
      home: null,
      away: null,
    })
    units.push({
      categoryId: catId,
      key,
      blockingTeams: [pairing.homeTeamId, pairing.awayTeamId],
      predecessors: [],
    })
  }

  if (tournament.format === 'championship') {
    for (const p of generateRoundRobin(teamIds)) pushRoundRobin('main', p)
    return { descriptors, units }
  }

  if (tournament.format === 'pools') {
    const numPools = tournament.formatConfig?.numPools
    if (!Number.isInteger(numPools) || (numPools as number) < 1) {
      throw new SchedulerError(
        `La catégorie « ${tournament.name} » (poules) doit préciser un nombre de poules.`
      )
    }
    for (const p of generatePoolPairings(teamIds, numPools as number)) {
      pushRoundRobin('pool', p)
    }
    return { descriptors, units }
  }

  if (tournament.format === 'knockout') {
    const entrants: SlotSource[] = teamIds.map((id) => ({ type: 'team', teamId: id }))
    const bracket = buildKnockout({
      entrants,
      thirdPlace: tournament.formatConfig?.thirdPlace ?? false,
    })
    for (const m of bracket.matches) pushBracketMatch(catId, m, descriptors, units)
    return { descriptors, units }
  }

  throw new SchedulerError(
    `Le format « ${tournament.format} » de la catégorie « ${tournament.name} » n'est pas pris en charge dans un événement multi-catégories (championnat, poules, élimination directe). Utilisez un tournoi autonome pour ce format.`
  )
}

/** Ajoute un match de bracket comme descripteur + unité (nourriciers = dépendances). */
function pushBracketMatch(
  categoryId: number,
  m: BracketMatch,
  descriptors: MatchDescriptor[],
  units: EventGridUnit[]
): void {
  const nsId = `${categoryId}:${m.id}`
  const home = namespaceSource(categoryId, m.home)
  const away = namespaceSource(categoryId, m.away)

  descriptors.push({
    categoryId,
    key: nsId,
    bracketId: nsId,
    stage: 'knockout',
    roundNumber: m.round,
    groupLabel: null,
    bracketRound: m.bracketRound,
    bracketSlot: m.slot,
    homeTeamId: teamIdOf(m.home),
    awayTeamId: teamIdOf(m.away),
    home: deferredOf(home),
    away: deferredOf(away),
  })

  const blockingTeams = [teamIdOf(m.home), teamIdOf(m.away)].filter((x): x is number => x !== null)
  const predecessors = [home, away]
    .filter((s) => s.type === 'match_winner' || s.type === 'match_loser')
    .map((s) => (s as { matchId: string }).matchId)

  units.push({ categoryId, key: nsId, blockingTeams, predecessors })
}

/**
 * Génère le planning combiné d'un événement : place les matchs de toutes ses
 * catégories (round-robin et/ou élimination directe) sur le pool de terrains
 * partagé, puis attribue les horaires en une passe (rythme + pause déjeuner de
 * l'événement).
 *
 * Les catégories (tournois) doivent avoir leurs `teams` préchargées. Propage les
 * `SchedulerError` (paramètres invalides, format non supporté, infaisabilité).
 */
export function generateEventSchedule(event: Event, categories: Tournament[]): EventSchedule {
  if (categories.length === 0) {
    throw new SchedulerError('Ajoutez au moins une catégorie à cet événement.')
  }

  const descriptorByKey = new Map<string, MatchDescriptor>()
  const allUnits: EventGridUnit[] = []
  for (const tournament of categories) {
    const { descriptors, units } = categoryMatches(
      tournament,
      tournament.teams.map((t) => t.id)
    )
    for (const d of descriptors) descriptorByKey.set(d.key, d)
    allUnits.push(...units)
  }

  const { placed, slotsCount, restSlots } = placeEventGrid(allUnits, event.numTerrains)

  const slotStart = assignSlotTimes(slotsCount, {
    startTime: hhmm(event.startTime),
    matchDurationMin: event.matchDurationMin,
    breakDurationMin: event.breakDurationMin,
    lunchStart: event.lunchStart ? hhmm(event.lunchStart) : null,
    lunchDurationMin: event.lunchDurationMin,
  })

  const matches: EventScheduledMatch[] = placed
    .map((p) => {
      const d = descriptorByKey.get(p.key)!
      return {
        categoryId: d.categoryId,
        bracketId: d.bracketId,
        stage: d.stage,
        roundNumber: d.roundNumber,
        groupLabel: d.groupLabel,
        bracketRound: d.bracketRound,
        bracketSlot: d.bracketSlot,
        slotIndex: p.slotIndex,
        terrainNumber: p.terrainNumber,
        startsAtMinutes: slotStart[p.slotIndex],
        startTime: minutesToTime(slotStart[p.slotIndex]),
        homeTeamId: d.homeTeamId,
        awayTeamId: d.awayTeamId,
        home: d.home,
        away: d.away,
      }
    })
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

/** Type de source persisté quand l'équipe est connue vs différée. */
function homeSourceTypeOf(m: EventScheduledMatch) {
  return m.home?.type ?? (m.homeTeamId !== null ? ('team' as const) : null)
}
function awaySourceTypeOf(m: EventScheduledMatch) {
  return m.away?.type ?? (m.awayTeamId !== null ? ('team' as const) : null)
}

/**
 * Persiste le planning d'un événement (remplace tous les matchs de toutes ses
 * catégories, passe les statuts à `scheduled`), le tout dans une transaction pour
 * une régénération sûre.
 *
 * Deux passes (comme le planning bracket mono-tournoi) : on insère d'abord tous les
 * matchs, puis on résout les références `match_winner`/`match_loser` (id abstraits
 * namespacés `${categoryId}:${bracketId}`) vers les **id DB réels** — les self-FK
 * `*_source_match_id` sont cohérentes une fois toute la grille écrite.
 *
 * `scheduled_at` est construit en UTC (date de l'événement + offset du créneau) :
 * l'heure murale (HH:mm) reste stable en lecture, sans dérive de fuseau.
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
    bracketRound: m.bracketRound,
    bracketSlot: m.bracketSlot,
    homeSourceType: homeSourceTypeOf(m),
    homeSourceMatchId: null,
    homeSourcePool: m.home?.type === 'pool_rank' ? m.home.pool : null,
    homeSourceRank: m.home?.type === 'pool_rank' ? m.home.rank : null,
    awaySourceType: awaySourceTypeOf(m),
    awaySourceMatchId: null,
    awaySourcePool: m.away?.type === 'pool_rank' ? m.away.pool : null,
    awaySourceRank: m.away?.type === 'pool_rank' ? m.away.rank : null,
  }))

  const categoryIds = categories.map((c) => c.id)

  await db.transaction(async (trx) => {
    await Match.query({ client: trx }).whereIn('tournament_id', categoryIds).delete()

    // Passe 1 : insertion (l'ordre du retour suit l'ordre d'entrée).
    const created = await Match.createMany(rows, { client: trx })
    const idByBracketId = new Map<string, number>()
    schedule.matches.forEach((m, i) => {
      if (m.bracketId) idByBracketId.set(m.bracketId, created[i].id)
    })

    // Passe 2 : résolution des références de source vers les id DB réels.
    for (let i = 0; i < schedule.matches.length; i++) {
      const m = schedule.matches[i]
      const row = created[i]
      let dirty = false
      if (m.home?.type === 'match_winner' || m.home?.type === 'match_loser') {
        row.homeSourceMatchId = idByBracketId.get(m.home.matchId) ?? null
        dirty = true
      }
      if (m.away?.type === 'match_winner' || m.away?.type === 'match_loser') {
        row.awaySourceMatchId = idByBracketId.get(m.away.matchId) ?? null
        dirty = true
      }
      if (dirty) {
        row.useTransaction(trx)
        await row.save()
      }
    }

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
 * compteurs globaux de la grille partagée. Réutilise `viewFromPhased` (testée) en
 * projetant les matchs de chaque catégorie en un `PhasedSchedule` mono-catégorie —
 * les participants différés (bracket) y sont nommés lisiblement.
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

    const phasedMatches: PhasedMatch[] = catMatches.map((m) => ({
      bracketId: m.bracketId,
      stage: m.stage,
      roundNumber: m.roundNumber,
      groupLabel: m.groupLabel,
      bracketRound: m.bracketRound,
      bracketSlot: m.bracketSlot,
      slotIndex: m.slotIndex,
      terrainNumber: m.terrainNumber,
      startsAtMinutes: m.startsAtMinutes,
      startTime: m.startTime,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      home: m.home,
      away: m.away,
    }))
    const endsAtMinutes = catMatches.reduce(
      (max, m) => Math.max(max, m.startsAtMinutes + event.matchDurationMin),
      0
    )
    const phased: PhasedSchedule = {
      format: tournament.format,
      matches: phasedMatches,
      slotsCount: schedule.slotsCount,
      endsAtMinutes,
    }

    return {
      categoryId: tournament.id,
      name: tournament.name,
      category: tournament.category,
      format: tournament.format,
      publicSlug: tournament.publicSlug,
      planning: viewFromPhased(phased, names),
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
 * n'a encore de planning. Réutilise `viewFromMatches` (mono-catégorie, robuste aux
 * participants différés) sur les matchs de chaque catégorie, avec ses équipes
 * préchargées.
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
