import type User from '#models/user'

/**
 * Autorisations sur les événements multi-catégories (issue #34).
 *
 * Comme pour les tournois : édition et gestion des catégories ouvertes aux deux
 * rôles ; suppression d'un événement ou d'une de ses catégories réservée au
 * responsable du club (`owner`), car destructrice.
 */
export const EventPolicy = {
  /** Supprimer un événement — owner uniquement. */
  delete(user: User): boolean {
    return user.isOwner
  },

  /** Supprimer une catégorie (= un tournoi) d'un événement — owner uniquement. */
  deleteCategory(user: User): boolean {
    return user.isOwner
  },
}
