import type User from '#models/user'

/**
 * Autorisations au niveau du club (issue #34).
 *
 * L'export et l'effacement des données du club (RGPD, issue #36) relèvent du
 * responsable du club (`owner`), représentant du responsable de traitement.
 */
export const ClubPolicy = {
  /** Exporter l'ensemble des données du club (portabilité) — owner uniquement. */
  exportData(user: User): boolean {
    return user.isOwner
  },
}
