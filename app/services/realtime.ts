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
  homeScore: number | null
  awayScore: number | null
  status: string
  /** Côté forfaitaire ('home' | 'away') si le match est un forfait, sinon null. */
  forfeitSide: 'home' | 'away' | null
  updatedBy: string | null
  updatedAt: string | null
}

/** État live d'un tournoi, poussé aux abonnés à chaque score enregistré. */
export type ResultsLiveUpdate = {
  type: 'results:updated'
  matchId: number
  matches: ResultRow[]
  standings: StandingRow[]
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
