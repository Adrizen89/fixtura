/**
 * Types du module scheduler — TypeScript pur, aucune dépendance DB.
 */

export interface SchedulerParams {
  /** Identifiants d'équipes (≥ 2, uniques). */
  teamIds: number[]
  /** Nombre de terrains disponibles (≥ 1). */
  numTerrains: number
  /** Heure de début "HH:mm". */
  startTime: string
  /** Durée d'un match en minutes (≥ 1). */
  matchDurationMin: number
  /** Pause entre matchs en minutes (≥ 0). */
  breakDurationMin: number
  /** Début de la pause déjeuner "HH:mm", ou null/absent. */
  lunchStart?: string | null
  /** Durée de la pause déjeuner en minutes (par défaut 0). */
  lunchDurationMin?: number
}

/** Un appariement issu du round-robin (avant placement horaire). */
export interface Pairing {
  /** Journée round-robin (1-based). */
  roundNumber: number
  homeTeamId: number
  awayTeamId: number
}

/** Un match placé dans le planning. */
export interface ScheduledMatch {
  /** Journée round-robin d'origine. */
  roundNumber: number
  /** Créneau temporel (0-based). */
  slotIndex: number
  /** Terrain (1-based). */
  terrainNumber: number
  /** Début du match en minutes depuis minuit. */
  startsAtMinutes: number
  /** Début du match "HH:mm". */
  startTime: string
  homeTeamId: number
  awayTeamId: number
}

export interface Schedule {
  matches: ScheduledMatch[]
  /** Nombre total de créneaux, créneaux de repos compris. */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé, aucun terrain utilisé). */
  restSlots: number
  /** Nombre de journées round-robin. */
  rounds: number
  /** Fin du dernier match, en minutes depuis minuit. */
  endsAtMinutes: number
}
