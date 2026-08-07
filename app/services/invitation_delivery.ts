import logger from '@adonisjs/core/services/logger'
import type Invitation from '#models/invitation'

/**
 * Livraison d'une invitation (issue #35) — **couche d'envoi isolée**.
 *
 * Choix v2 : l'invitation repose sur un **lien** non devinable (jeton + expiration)
 * que le responsable partage ; le lien est toujours affiché dans l'espace membres.
 * L'« envoi par email » est branché ici derrière une seule fonction : aujourd'hui
 * on journalise le lien (utile en dev / traçabilité), et un vrai transport SMTP
 * (`@adonisjs/mail`) pourra s'y insérer plus tard **sans toucher aux contrôleurs**.
 */
export async function deliverInvitation(invitation: Invitation, acceptUrl: string): Promise<void> {
  logger.info(
    { invitationId: invitation.id, email: invitation.email, acceptUrl },
    'Invitation prête — lien d’acceptation à transmettre à l’organisateur'
  )

  // Point d'insertion d'un envoi email réel (SMTP via @adonisjs/mail) le jour venu :
  //   await mail.send((message) => message.to(invitation.email).subject(...).htmlView(...))
}
