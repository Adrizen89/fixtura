import type User from '#models/user'

/**
 * Consultation du journal d'audit (issue #117) — réservée au responsable du club
 * (`owner`). Le cloisonnement par club est appliqué à la lecture (filtrage
 * `club_id` sur le club de l'utilisateur connecté).
 */
export const AuditPolicy = {
  /** Voir le journal d'audit du club — owner uniquement. */
  view(user: User): boolean {
    return user.isOwner
  },
}
