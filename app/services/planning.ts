import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Match from '#models/match'
import type Tournament from '#models/tournament'
import { generateSchedule } from '#services/scheduler/index'
import type { Schedule, SchedulerParams, SlotSource } from '#services/scheduler/index'
import { generatePhased } from '#services/scheduler/formats'
import type { PhasedSchedule } from '#services/scheduler/formats'

/**
 * Pont entre le module `scheduler` (TypeScript pur, testé, sans DB) et la base.
 * Le controller reste mince : il délègue ici la construction des paramètres,
 * la persistance des matchs et la mise en forme pour l'affichage.
 */

/** Ne garde que "HH:mm" d'une valeur `time` SQL qui peut arriver en "HH:mm:ss". */
function hhmm(value: string): string {
  return value.slice(0, 5)
}

/** Minutes depuis minuit → "HH:mm". */
function minutesToTime(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Champs horaires d'un tournoi nécessaires au scheduler (structural → testable). */
export interface PlanningTournamentParams {
  numTerrains: number
  startTime: string
  matchDurationMin: number
  breakDurationMin: number
  lunchStart: string | null
  lunchDurationMin: number
}

/** Construit les paramètres du scheduler à partir d'un tournoi et de ses équipes. */
export function schedulerParamsFor(
  t: PlanningTournamentParams,
  teamIds: number[]
): SchedulerParams {
  return {
    teamIds,
    numTerrains: t.numTerrains,
    startTime: hhmm(t.startTime),
    matchDurationMin: t.matchDurationMin,
    breakDurationMin: t.breakDurationMin,
    lunchStart: t.lunchStart ? hhmm(t.lunchStart) : null,
    lunchDurationMin: t.lunchDurationMin,
  }
}

/**
 * Génère le planning d'un tournoi (avec ses équipes préchargées).
 * Propage les `SchedulerError` (paramètres invalides, infaisabilité) telles quelles.
 */
export function generateFor(tournament: Tournament): Schedule {
  const teamIds = tournament.teams.map((team) => team.id)
  return generateSchedule(schedulerParamsFor(tournament, teamIds))
}

/**
 * Persiste un planning : remplace tous les matchs du tournoi et passe le statut
 * `draft` → `scheduled`, le tout dans une transaction (régénération sûre).
 *
 * `scheduled_at` est construit en UTC à partir de la date de l'événement + l'offset
 * en minutes du créneau, pour que l'heure murale (HH:mm) soit stable en lecture,
 * sans dérive de fuseau.
 */
export async function persistSchedule(tournament: Tournament, schedule: Schedule): Promise<void> {
  const { year, month, day } = tournament.eventDate
  const eventDay = DateTime.utc(year, month, day)

  const rows = schedule.matches.map((m) => ({
    tournamentId: tournament.id,
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
  }))

  await db.transaction(async (trx) => {
    await Match.query({ client: trx }).where('tournament_id', tournament.id).delete()
    await Match.createMany(rows, { client: trx })

    tournament.status = 'scheduled'
    tournament.useTransaction(trx)
    await tournament.save()
  })
}

/**
 * Génère un planning **multi-phases** en dispatchant sur `tournament.format`
 * (championnat / poules / élimination / hybride). Le championnat reste équivalent
 * au chemin v1 (`generateSchedule`). Propage les `SchedulerError` telles quelles.
 */
export function generatePhasedFor(tournament: Tournament): PhasedSchedule {
  const teamIds = tournament.teams.map((team) => team.id)
  const params = schedulerParamsFor(tournament, teamIds)
  return generatePhased(params, tournament.format, tournament.formatConfig ?? {})
}

/** Type de source persisté quand l'équipe est connue vs différée. */
function homeSourceTypeOf(m: { homeTeamId: number | null; home: SlotSource | null }) {
  return m.home?.type ?? (m.homeTeamId !== null ? ('team' as const) : null)
}
function awaySourceTypeOf(m: { awayTeamId: number | null; away: SlotSource | null }) {
  return m.away?.type ?? (m.awayTeamId !== null ? ('team' as const) : null)
}

/**
 * Persiste un planning multi-phases (remplace tout, `draft` → `scheduled`).
 *
 * Deux passes dans la même transaction : on insère d'abord tous les matchs (les
 * références `match_winner`/`match_loser` pointent vers des id **abstraits** de
 * l'arbre), puis on résout ces références vers les **id DB réels** via la
 * correspondance `bracketId → id`. Les self-FK `*_source_match_id` sont ainsi
 * cohérentes une fois toute la grille écrite.
 */
export async function persistPhasedSchedule(
  tournament: Tournament,
  phased: PhasedSchedule
): Promise<void> {
  const { year, month, day } = tournament.eventDate
  const eventDay = DateTime.utc(year, month, day)

  const rows = phased.matches.map((m) => ({
    tournamentId: tournament.id,
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

  await db.transaction(async (trx) => {
    await Match.query({ client: trx }).where('tournament_id', tournament.id).delete()

    // Passe 1 : insertion (l'ordre du retour suit l'ordre d'entrée).
    const created = await Match.createMany(rows, { client: trx })
    const idByBracketId = new Map<string, number>()
    phased.matches.forEach((m, i) => {
      if (m.bracketId) idByBracketId.set(m.bracketId, created[i].id)
    })

    // Passe 2 : résolution des références de source vers les id DB réels.
    for (let i = 0; i < phased.matches.length; i++) {
      const m = phased.matches[i]
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

    tournament.status = 'scheduled'
    tournament.useTransaction(trx)
    await tournament.save()
  })
}

/** Un match tel qu'affiché dans la grille. */
export interface PlanningMatchView {
  terrainNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

/** Un créneau horaire (ligne de la grille) et ses matchs par terrain. */
export interface PlanningSlotView {
  time: string
  matches: PlanningMatchView[]
}

/** Vue complète d'un planning (aperçu ou persistant), prête pour le front. */
export interface PlanningView {
  slots: PlanningSlotView[]
  matchCount: number
  roundsCount: number
  slotsCount: number
  startTime: string
  endTime: string
}

/** Regroupe des matchs (déjà mis en forme) par créneau horaire, terrains triés. */
function groupSlots(entries: { time: string; roundNumber: number; match: PlanningMatchView }[]): {
  slots: PlanningSlotView[]
  roundsCount: number
} {
  const byTime = new Map<string, PlanningMatchView[]>()
  const rounds = new Set<number>()

  for (const e of entries) {
    rounds.add(e.roundNumber)
    const bucket = byTime.get(e.time) ?? []
    bucket.push(e.match)
    byTime.set(e.time, bucket)
  }

  const slots = [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, matches]) => ({
      time,
      matches: matches.sort((a, b) => a.terrainNumber - b.terrainNumber),
    }))

  return { slots, roundsCount: rounds.size }
}

/** Construit la vue d'aperçu à partir d'un planning généré (non persisté). */
export function viewFromSchedule(
  schedule: Schedule,
  teamNameById: Map<number, string>
): PlanningView {
  const name = (id: number) => teamNameById.get(id) ?? `#${id}`

  const { slots, roundsCount } = groupSlots(
    schedule.matches.map((m) => ({
      time: m.startTime,
      roundNumber: m.roundNumber,
      match: {
        terrainNumber: m.terrainNumber,
        homeTeam: name(m.homeTeamId),
        awayTeam: name(m.awayTeamId),
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      },
    }))
  )

  return {
    slots,
    matchCount: schedule.matches.length,
    roundsCount,
    slotsCount: slots.length,
    startTime: slots[0]?.time ?? '—',
    endTime: minutesToTime(schedule.endsAtMinutes),
  }
}

/** Libellé court d'un tour de bracket (pour nommer un participant différé). */
function bracketRoundShort(code: string | null): string {
  switch (code) {
    case 'final':
      return 'Finale'
    case 'sf':
      return 'Demie'
    case 'qf':
      return 'Quart'
    case 'third':
      return 'Petite finale'
    case 'r16':
      return '8e'
    case 'r32':
      return '16e'
    case 'gf':
      return 'Grande finale'
  }
  // Double élimination : tableau principal `wb-r{n}` / repêchage `lb-r{n}`.
  const wb = /^wb-r(\d+)$/.exec(code ?? '')
  if (wb) return `Principal T${wb[1]}`
  const lb = /^lb-r(\d+)$/.exec(code ?? '')
  if (lb) return `Repêchage T${lb[1]}`
  return code ?? 'Tour'
}

/** « 1er Poule A », « 2e Poule B ». */
function poolRankLabel(pool: string | null, rank: number | null): string {
  const r = rank === 1 ? '1er' : `${rank ?? '?'}e`
  return `${r} Poule ${pool ?? '?'}`
}

/**
 * Vue d'aperçu d'un planning **multi-phases** (non persisté). Les participants
 * différés (bracket / hybride) sont nommés lisiblement (« Vainqueur Quart #1 »,
 * « 1er Poule A ») en attendant leur résolution par la progression (#45).
 */
export function viewFromPhased(
  phased: PhasedSchedule,
  teamNameById: Map<number, string>
): PlanningView {
  const name = (id: number) => teamNameById.get(id) ?? `#${id}`
  const labelById = new Map<string, string>()
  for (const m of phased.matches) {
    if (m.bracketId) {
      labelById.set(
        m.bracketId,
        `${bracketRoundShort(m.bracketRound)} #${(m.bracketSlot ?? 0) + 1}`
      )
    }
  }
  const fromSource = (s: SlotSource | null): string => {
    if (!s) return 'À définir'
    switch (s.type) {
      case 'team':
        return name(s.teamId)
      case 'match_winner':
        return `Vainqueur ${labelById.get(s.matchId) ?? s.matchId}`
      case 'match_loser':
        return `Perdant ${labelById.get(s.matchId) ?? s.matchId}`
      case 'pool_rank':
        return poolRankLabel(s.pool, s.rank)
    }
  }
  const participant = (teamId: number | null, source: SlotSource | null): string =>
    teamId !== null ? name(teamId) : fromSource(source)

  const { slots, roundsCount } = groupSlots(
    phased.matches.map((m) => ({
      time: m.startTime,
      roundNumber: m.roundNumber,
      match: {
        terrainNumber: m.terrainNumber,
        homeTeam: participant(m.homeTeamId, m.home),
        awayTeam: participant(m.awayTeamId, m.away),
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      },
    }))
  )

  return {
    slots,
    matchCount: phased.matches.length,
    roundsCount,
    slotsCount: slots.length,
    startTime: slots[0]?.time ?? '—',
    endTime: minutesToTime(phased.endsAtMinutes),
  }
}

/**
 * Construit la vue d'un planning déjà persisté.
 * Les relations `homeTeam` / `awayTeam` doivent être préchargées par l'appelant.
 * Les matchs à participants différés (équipe nulle) sont nommés depuis leurs
 * colonnes de source (`*_source_*`), sans jamais déréférencer une équipe absente.
 */
export function viewFromMatches(matches: Match[], matchDurationMin: number): PlanningView {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const labelOfMatch = (mm: Match) =>
    `${bracketRoundShort(mm.bracketRound)} #${(mm.bracketSlot ?? 0) + 1}`
  const side = (
    teamId: number | null,
    team: { name: string } | null,
    type: string | null,
    matchId: number | null,
    pool: string | null,
    rank: number | null
  ): string => {
    if (teamId !== null && team) return team.name
    if (type === 'match_winner' || type === 'match_loser') {
      const ref = matchId !== null ? byId.get(matchId) : undefined
      const who = type === 'match_winner' ? 'Vainqueur' : 'Perdant'
      return `${who} ${ref ? labelOfMatch(ref) : '?'}`
    }
    if (type === 'pool_rank') return poolRankLabel(pool, rank)
    return 'À définir'
  }

  const { slots, roundsCount } = groupSlots(
    matches.map((m) => {
      const at = m.scheduledAt.toUTC()
      return {
        time: at.toFormat('HH:mm'),
        roundNumber: m.roundNumber,
        match: {
          terrainNumber: m.terrainNumber,
          homeTeam: side(
            m.homeTeamId,
            m.homeTeam ?? null,
            m.homeSourceType,
            m.homeSourceMatchId,
            m.homeSourcePool,
            m.homeSourceRank
          ),
          awayTeam: side(
            m.awayTeamId,
            m.awayTeam ?? null,
            m.awaySourceType,
            m.awaySourceMatchId,
            m.awaySourcePool,
            m.awaySourceRank
          ),
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          status: m.status,
        },
      }
    })
  )

  const lastStart = matches.reduce(
    (max, m) => Math.max(max, m.scheduledAt.toUTC().hour * 60 + m.scheduledAt.toUTC().minute),
    0
  )

  return {
    slots,
    matchCount: matches.length,
    roundsCount,
    slotsCount: slots.length,
    startTime: slots[0]?.time ?? '—',
    endTime: matches.length ? minutesToTime(lastStart + matchDurationMin) : '—',
  }
}
