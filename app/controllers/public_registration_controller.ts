import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import { teamRegistrationValidator } from '#validators/team_registration'
import {
  submitRegistration,
  registrationStatusFor,
  remainingSlots,
  RegistrationClosedError,
  RegistrationFullError,
  DuplicateTeamNameError,
} from '#services/team_registration'
import { hitRateLimit } from '#services/rate_limit'

/**
 * Formulaire **public** d'inscription d'une équipe à un tournoi (issue #112).
 *
 * Sans compte, **sans paiement**, via un `registrationToken` non devinable
 * (`/inscription/:token`). Ces routes ne passent ni par `auth` ni par `tenant` : le
 * scope tenant est inactif hors requête admin, donc la recherche par jeton n'est pas
 * filtrée par club (comme l'écran public de résultats).
 *
 * On n'expose que des données publiques (nom du tournoi, club, places restantes) —
 * jamais les contacts déjà inscrits ni l'`id` du club.
 */
export default class PublicRegistrationController {
  private findByToken(token: string) {
    return Tournament.query()
      .where('registration_token', token)
      .withCount('teams')
      .withCount('registrations', (q) => q.where('status', 'pending'))
      .preload('club')
      .first()
  }

  /**
   * Occupation courante = équipes confirmées + demandes en attente (#113). La
   * « fermeture pleine » en découle : une demande non encore validée réserve une place.
   */
  private occupancyOf(tournament: Tournament): number {
    return (
      Number(tournament.$extras.teams_count ?? 0) +
      Number(tournament.$extras.registrations_count ?? 0)
    )
  }

  /** Vue publique du formulaire (ou état « fermé » / « complet »). */
  async show({ inertia, params }: HttpContext) {
    const tournament = await this.findByToken(params.token)
    if (!tournament) {
      return inertia.render('public/registration_invalid', {})
    }

    return inertia.render(
      'public/register',
      this.viewData(tournament, this.occupancyOf(tournament))
    )
  }

  /** Enregistre une inscription (honeypot + rate-limit + validation + service). */
  async register({ inertia, request, response, params, session }: HttpContext) {
    const tournament = await this.findByToken(params.token)
    if (!tournament) {
      return inertia.render('public/registration_invalid', {})
    }

    // Anti-spam 1/2 — honeypot : un champ leurre invisible ; s'il est rempli, c'est
    // un robot. On répond « succès » sans rien créer (ne pas informer le bot).
    if (String(request.input('website') ?? '').trim() !== '') {
      session.flash('success', 'Inscription enregistrée.')
      return response.redirect().toRoute('public.registration', { token: params.token })
    }

    // Anti-spam 2/2 — rate-limit par IP + tournoi (fenêtre glissante en mémoire).
    const key = `register:${tournament.id}:${request.ip()}`
    if (hitRateLimit(key, { max: 5, windowMs: 10 * 60 * 1000 })) {
      session.flash('error', 'Trop de tentatives. Réessayez dans quelques minutes.')
      return response.redirect().toRoute('public.registration', { token: params.token })
    }

    const data = await request.validateUsing(teamRegistrationValidator, {
      meta: { tournamentId: tournament.id },
    })

    try {
      await submitRegistration(tournament, { name: data.name, contactEmail: data.contactEmail })
    } catch (error) {
      if (
        error instanceof RegistrationClosedError ||
        error instanceof RegistrationFullError ||
        error instanceof DuplicateTeamNameError
      ) {
        session.flash('error', error.message)
        return response.redirect().toRoute('public.registration', { token: params.token })
      }
      throw error
    }

    session.flash(
      'success',
      `La demande d'inscription de l'équipe « ${data.name.trim()} » a bien été envoyée. ` +
        `L'organisateur la validera avant le tournoi.`
    )
    return response.redirect().toRoute('public.registration', { token: params.token })
  }

  /** Données publiques passées à la page (aucune donnée personnelle). */
  private viewData(tournament: Tournament, occupancy: number) {
    return {
      tournament: {
        name: tournament.name,
        category: tournament.category,
        eventDate: tournament.eventDate.toISODate(),
      },
      club: { name: tournament.club.name },
      status: registrationStatusFor(tournament, occupancy),
      remaining: remainingSlots(tournament, occupancy),
    }
  }
}
