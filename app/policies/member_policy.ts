import type User from '#models/user'

/**
 * Autorisations de gestion des membres du club (issue #35).
 *
 * Lister les membres, inviter, changer un rôle, retirer un membre : réservé au
 * responsable du club (`owner`). Le cloisonnement par club est garanti en amont
 * (scope global + filtrage explicite sur `club_id` pour les `users`).
 */
export const MemberPolicy = {
  /** Gérer les membres et invitations du club — owner uniquement. */
  manage(user: User): boolean {
    return user.isOwner
  },
}
