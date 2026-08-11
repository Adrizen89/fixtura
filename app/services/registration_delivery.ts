import logger from '@adonisjs/core/services/logger'
import type TeamRegistration from '#models/team_registration'

/**
 * Notification à l'équipe de la décision sur sa demande d'inscription (issue #113) —
 * **couche d'envoi isolée**, calquée sur `invitation_delivery` (#35).
 *
 * Aujourd'hui on journalise la décision (utile en dev / traçabilité) ; un vrai
 * transport SMTP (`@adonisjs/mail`) pourra s'y insérer plus tard **sans toucher aux
 * contrôleurs ni au service métier**. Best-effort : l'appelant ne doit jamais faire
 * échouer la décision de l'organisateur à cause de l'envoi.
 */
export type RegistrationDecision = 'approved' | 'rejected'

export async function deliverRegistrationDecision(
  registration: TeamRegistration,
  tournamentName: string,
  decision: RegistrationDecision
): Promise<void> {
  logger.info(
    {
      registrationId: registration.id,
      email: registration.contactEmail,
      team: registration.teamName,
      tournament: tournamentName,
      decision,
    },
    decision === 'approved'
      ? 'Inscription validée — à notifier à l’équipe'
      : 'Inscription refusée — à notifier à l’équipe'
  )

  // Point d'insertion d'un envoi email réel (SMTP via @adonisjs/mail) le jour venu :
  //   await mail.send((message) => message.to(registration.contactEmail).subject(...).htmlView(...))
}
