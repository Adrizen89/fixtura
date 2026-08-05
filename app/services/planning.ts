import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Match from '#models/match'
import type Tournament from '#models/tournament'
import { generateSchedule } from '#services/scheduler/index'
import type { Schedule, SchedulerParams } from '#services/scheduler/index'

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

/**
 * Construit la vue d'un planning déjà persisté.
 * Les relations `homeTeam` / `awayTeam` doivent être préchargées par l'appelant.
 */
export function viewFromMatches(matches: Match[], matchDurationMin: number): PlanningView {
  const { slots, roundsCount } = groupSlots(
    matches.map((m) => {
      const at = m.scheduledAt.toUTC()
      return {
        time: at.toFormat('HH:mm'),
        roundNumber: m.roundNumber,
        match: {
          terrainNumber: m.terrainNumber,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
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
