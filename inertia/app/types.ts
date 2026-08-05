/**
 * Types partagés côté front (Inertia/Vue).
 */

export type UserRole = 'owner' | 'organizer'

export interface AuthUser {
  id: number
  fullName: string | null
  email: string
  role: UserRole
}

export interface FlashMessages {
  success: string | null
  error: string | null
}

export type TournamentStatus = 'draft' | 'scheduled' | 'live' | 'finished'

export interface Team {
  id: number
  name: string
}

export interface Tournament {
  id: number
  name: string
  category: string
  eventDate: string
  startTime: string
  matchDurationMin: number
  breakDurationMin: number
  lunchStart: string | null
  lunchDurationMin: number
  numTerrains: number
  status: TournamentStatus
  publicSlug: string
  teams?: Team[]
  teamsCount?: number
}

export interface PlanningMatchView {
  terrainNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

export interface PlanningSlotView {
  time: string
  matches: PlanningMatchView[]
}

export interface PlanningView {
  slots: PlanningSlotView[]
  matchCount: number
  roundsCount: number
  slotsCount: number
  startTime: string
  endTime: string
}

export interface StandingRow {
  rank: number
  teamId: number
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface ResultMatchRow {
  id: number
  time: string
  terrainNumber: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string
  updatedBy: string | null
  updatedAt: string | null
}

/** Événement reçu sur le canal SSE d'un tournoi (miroir de #services/realtime). */
export interface ResultsLiveUpdate {
  type: 'results:updated'
  matchId: number
  matches: ResultMatchRow[]
  standings: StandingRow[]
}

export interface TournamentFormData {
  name: string
  category: string
  eventDate: string
  startTime: string
  matchDurationMin: number
  breakDurationMin: number
  lunchStart: string
  lunchDurationMin: number
  numTerrains: number
}
