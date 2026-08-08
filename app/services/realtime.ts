import transmit from '@adonisjs/transmit/services/main'
import type { Broadcastable } from '@boringnode/transmit/types'
import type { StandingRow } from '#services/standings'

/**
 * Diffusion temps réel (SSE) — cf. CLAUDE.md §4, §9.
 *
 * Un tournoi = un canal, identifié par le `public_slug` (non devinable) plutôt que
 * par l'id séquentiel : la grille de saisie admin comme le futur écran public
 * (issue #5) s'abonnent au **même** canal, si bien qu'une seule diffusion touche
 * tous les abonnés. Les données diffusées (scores + classement) sont exactement
 * celles déjà affichées publiquement : pas d'info sensible sur ce canal.
 */

/** Nom du canal SSE d'un tournoi. Doit rester identique côté client. */
export function tournamentChannel(publicSlug: string): string {
  return `tournaments/${publicSlug}`
}

/** Une ligne de match telle qu'exposée (grille de saisie + diffusion SSE). */
export type ResultRow = {
  id: number
  time: string
  terrainNumber: number
  homeTeam: string
  awayTeam: string
  // Id des équipes (null si le participant est encore différé — slot de bracket non
  // résolu). Permet à l'écran public de suivre une équipe de façon fiable (issue #39).
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number | null
  awayScore: number | null
  status: string
  /** Côté forfaitaire ('home' | 'away') si le match est un forfait, sinon null. */
  forfeitSide: 'home' | 'away' | null
  /** Côté vainqueur aux tirs au but si le match a fini nul en élimination (#105). */
  shootoutWinnerSide: 'home' | 'away' | null
  updatedBy: string | null
  updatedAt: string | null
  // Métadonnées de phase (formats v2) — pour l'écran bracket / poules.
  stage: string
  bracketRound: string | null
  bracketSlot: number | null
  groupLabel: string | null
}

/** Classement d'une poule (formats poules / hybride). */
export type PoolStanding = {
  label: string
  standings: StandingRow[]
}

/** État live d'un tournoi, poussé aux abonnés à chaque score enregistré. */
export type ResultsLiveUpdate = {
  type: 'results:updated'
  matchId: number
  matches: ResultRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
}

/**
 * Diffuse le nouvel état (scores + classement) à tous les abonnés du tournoi.
 * En instance unique (v1), la diffusion est immédiate et en mémoire. Le double cast
 * est nécessaire car le payload typé n'expose pas l'index signature attendue par
 * `Broadcastable` (les données restent sérialisables JSON).
 */
export function broadcastResults(publicSlug: string, update: ResultsLiveUpdate): void {
  transmit.broadcast(tournamentChannel(publicSlug), update as unknown as Broadcastable)
}
