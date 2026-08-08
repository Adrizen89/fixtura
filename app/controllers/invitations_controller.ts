import type { HttpContext } from '@adonisjs/core/http'
import Invitation from '#models/invitation'
import User from '#models/user'
import { normalizeEmail } from '#models/user'
import { acceptInvitationValidator } from '#validators/onboarding'
import { acceptInvitation } from '#services/invitations'

/**
 * Acceptation d'une invitation d'organisateur (issue #35) — parcours **public**
 * (invités), via un jeton non devinable `/invitations/:token`.
 *
 * La recherche par jeton s'exécute hors contexte tenant → non filtrée par club
 * (l'invité n'appartient encore à aucun club). L'acceptation crée le compte dans le
 * club et le rôle portés par l'invitation, puis connecte le nouvel organisateur.
 */
export default class InvitationsController {
  private findByToken(token: string) {
    return Invitation.query().where('token', token).preload('club').first()
  }

  /** Motif d'invalidité d'une invitation, pour l'écran dédié. */
  private invalidReason(invitation: Invitation | null): 'not_found' | 'accepted' | 'expired' {
    if (!invitation) return 'not_found'
    return invitation.isAccepted ? 'accepted' : 'expired'
  }

  /** Écran d'acceptation (ou page « lien invalide »). */
  async show({ inertia, params }: HttpContext) {
    const invitation = await this.findByToken(params.token)
    if (!invitation || !invitation.isPending) {
      return inertia.render('invitations/invalid', { reason: this.invalidReason(invitation) })
    }

    return inertia.render('invitations/accept', {
      token: invitation.token,
      email: invitation.email,
      clubName: invitation.club.name,
      role: invitation.role,
    })
  }

  /** Crée le compte organisateur à partir de l'invitation, puis connecte. */
  async accept({ request, response, params, auth, session, inertia }: HttpContext) {
    const invitation = await this.findByToken(params.token)
    if (!invitation || !invitation.isPending) {
      return inertia.render('invitations/invalid', { reason: this.invalidReason(invitation) })
    }

    // Un compte peut déjà exister pour cet email (identifiant unique global).
    const existing = await User.findBy('email', normalizeEmail(invitation.email))
    if (existing) {
      session.flash('error', 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous.')
      return response.redirect().toRoute('login.show')
    }

    const data = await request.validateUsing(acceptInvitationValidator)
    const user = await acceptInvitation(invitation, {
      fullName: data.fullName,
      password: data.password,
    })

    await auth.use('web').login(user)
    session.flash('success', 'Bienvenue ! Votre compte organisateur est prêt.')
    return response.redirect().toRoute('tournaments.index')
  }
}
