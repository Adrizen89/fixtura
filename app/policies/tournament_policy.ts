import type User from '#models/user'

/**
 * Autorisations sur les tournois (issue #34 — rôles consolidés + policies).
 *
 * Lecture / création / édition / saisie des résultats : ouvertes aux deux rôles
 * (l'`organizer` fait tourner la journée). Les actions **destructrices** (supprimer
 * un tournoi) sont réservées au responsable du club (`owner`). Le cloisonnement par
 * club, lui, est garanti en amont par le scope global (`TenantContext`), pas ici.
 */
export const TournamentPolicy = {
  /** Supprimer un tournoi (cascade équipes + matchs) — owner uniquement. */
  delete(user: User): boolean {
    return user.isOwner
  },
}
