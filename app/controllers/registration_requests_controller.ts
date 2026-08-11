import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import TeamRegistration from '#models/team_registration'
import {
  approveRegistration,
  rejectRegistration,
  DuplicateTeamNameError,
  RegistrationNotPendingError,
} from '#services/team_registration'
import { deliverRegistrationDecision } from '#services/registration_delivery'

/**
 * Décision de l'organisateur sur une demande d'inscription en ligne (issue #113) —
 * espace **admin** (organisateur authentifié). Valider crée l'équipe dans le tournoi ;
 * refuser archive la demande. L'équipe est notifiée dans les deux cas (brique email
 * `registration_delivery`, best-effort).
 *
 * Cloisonnement par club **automatique** (scope global `TenantContext`, issue #34) :
 * le tournoi d'un autre club est invisible (`firstOrFail` → 404), et la demande est
 * cherchée sous ce tournoi (une demande d'un autre club → 404). Ce n'est pas une
 * action réservée à l'`owner` : tout organisateur gère les inscriptions.
 */
export default class RegistrationRequestsController {
  /** Charge la demande en attente sous un tournoi du club courant, ou 404. */
  private async findRegistration(tournamentId: number, registrationId: number) {
    const tournament = await Tournament.query().where('id', tournamentId).firstOrFail()
    const registration = await TeamRegistration.query()
      .where('id', registrationId)
      .where('tournament_id', tournament.id)
      .firstOrFail()
    return { tournament, registration }
  }

  /** Valide une demande → crée l'équipe + notifie. */
  async approve({ params, response, auth, session, i18n }: HttpContext) {
    const { tournament, registration } = await this.findRegistration(
      params.id,
      params.registrationId
    )

    try {
      const team = await approveRegistration(registration, auth.user!)
      await deliverRegistrationDecision(registration, tournament.name, 'approved')
      session.flash('success', i18n.t('messages.flash.admin.requestApproved', { team: team.name }))
    } catch (error) {
      if (error instanceof DuplicateTeamNameError || error instanceof RegistrationNotPendingError) {
        session.flash('error', error.message)
      } else {
        throw error
      }
    }

    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Refuse une demande → archive + notifie. */
  async reject({ params, response, auth, session, i18n }: HttpContext) {
    const { tournament, registration } = await this.findRegistration(
      params.id,
      params.registrationId
    )

    try {
      await rejectRegistration(registration, auth.user!)
      await deliverRegistrationDecision(registration, tournament.name, 'rejected')
      session.flash(
        'success',
        i18n.t('messages.flash.admin.requestRejected', { team: registration.teamName })
      )
    } catch (error) {
      if (error instanceof RegistrationNotPendingError) {
        session.flash('error', error.message)
      } else {
        throw error
      }
    }

    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
