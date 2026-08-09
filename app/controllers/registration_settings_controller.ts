import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import { registrationSettingsValidator } from '#validators/team_registration'
import { openRegistration, closeRegistration } from '#services/team_registration'

/**
 * Réglages des inscriptions en ligne d'un tournoi (issue #112) — espace **admin**
 * (organisateur authentifié). Ouverture/fermeture + capacité facultative.
 *
 * Cloisonnement par club **automatique** (scope global `TenantContext`, issue #34) :
 * un tournoi d'un autre club est invisible (`firstOrFail` → 404). Ce n'est pas une
 * action destructrice/de gestion du club → ouverte à tout organisateur (pas
 * réservée à l'`owner`).
 */
export default class RegistrationSettingsController {
  async update({ request, response, params, session }: HttpContext) {
    const tournament = await Tournament.query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(registrationSettingsValidator)

    if (data.open) {
      await openRegistration(tournament, data.capacity ?? null)
      session.flash('success', 'Inscriptions en ligne ouvertes.')
    } else {
      await closeRegistration(tournament)
      session.flash('success', 'Inscriptions en ligne fermées.')
    }

    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
