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

/** Club courant de l'utilisateur connecté (contexte multi-tenant — issue #34). */
export interface CurrentClub {
  id: number
  name: string
  slug: string
}

export interface FlashMessages {
  success: string | null
  error: string | null
}

export type TournamentStatus = 'draft' | 'scheduled' | 'live' | 'finished'

export type TournamentFormat = 'championship' | 'pools' | 'knockout' | 'hybrid'

export interface TournamentFormatConfig {
  numPools?: number | null
  qualifiersPerPool?: number | null
  thirdPlace?: boolean
}

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
  format: TournamentFormat
  formatConfig: TournamentFormatConfig | null
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
  /** Côté forfaitaire ('home' | 'away') si le match est un forfait, sinon null. */
  forfeitSide: 'home' | 'away' | null
  updatedBy: string | null
  updatedAt: string | null
  /** Phase du match (formats v2) : 'main' | 'pool' | 'knockout'. */
  stage: string
  bracketRound: string | null
  bracketSlot: number | null
  groupLabel: string | null
}

/** Classement d'une poule (formats poules / hybride). */
export interface PoolStanding {
  label: string
  standings: StandingRow[]
}

/** Événement reçu sur le canal SSE d'un tournoi (miroir de #services/realtime). */
export interface ResultsLiveUpdate {
  type: 'results:updated'
  matchId: number
  matches: ResultMatchRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
}

// --- Événements multi-catégories (#32) ---

export type EventStatus = TournamentStatus

/** Un événement tel qu'affiché dans la liste / le détail. */
export interface EventItem {
  id: number
  name: string
  eventDate: string
  startTime: string
  matchDurationMin: number
  breakDurationMin: number
  lunchStart: string | null
  lunchDurationMin: number
  numTerrains: number
  status: EventStatus
  publicSlug: string
  categoriesCount?: number
}

/** Une catégorie (tournoi) listée dans le détail d'un événement. */
export interface EventCategory {
  id: number
  name: string
  category: string
  format: TournamentFormat
  status: TournamentStatus
  publicSlug: string
  formatConfig: TournamentFormatConfig | null
  teamsCount?: number
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

/** Une catégorie de l'écran public d'événement (données live incluses). */
export interface PublicEventCategory {
  id: number
  name: string
  category: string
  status: TournamentStatus
  publicSlug: string
  format: TournamentFormat
  matches: ResultMatchRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
}

export interface EventFormData {
  name: string
  eventDate: string
  startTime: string
  matchDurationMin: number
  breakDurationMin: number
  lunchStart: string
  lunchDurationMin: number
  numTerrains: number
}

export interface EventCategoryFormData {
  name: string
  category: string
  format: 'championship' | 'pools' | 'knockout'
  numPools: number | null
  thirdPlace: boolean
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
  format: TournamentFormat
  numPools: number | null
  qualifiersPerPool: number | null
  thirdPlace: boolean
}
