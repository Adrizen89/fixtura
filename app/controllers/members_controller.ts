import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { normalizeEmail } from '#models/user'
import Invitation from '#models/invitation'
import { invitationValidator, memberRoleValidator } from '#validators/onboarding'
import { createInvitation } from '#services/invitations'
import { deliverInvitation } from '#services/invitation_delivery'
import { MemberPolicy } from '#policies/member_policy'
import { deny } from '#policies/authorize'

/**
 * Gestion des membres d'un club (issue #35) — réservé au responsable (`owner`).
 *
 * Lister les membres et invitations en attente, inviter un organisateur (lien +
 * jeton + expiration), révoquer une invitation, changer un rôle, retirer un membre.
 * Le cloisonnement par club est automatique pour `Invitation` (scope global) et
 * explicite pour `users` (filtrage `club_id`). Une garde empêche de laisser le club
 * sans aucun responsable.
 */
export default class MembersController {
  /** Lien d'acceptation absolu à partager (jeton d'invitation). */
  private acceptUrl(request: HttpContext['request'], token: string): string {
    return `${request.protocol()}://${request.host()}/invitations/${token}`
  }

  /** Nombre de responsables (`owner`) actifs dans le club. */
  private async ownerCount(clubId: number): Promise<number> {
    const row = await db
      .from('users')
      .where('club_id', clubId)
      .where('role', 'owner')
      .count('* as total')
      .first()
    return Number(row?.total ?? 0)
  }

  /** Membre du club (404 si hors club — `users` filtré explicitement sur `club_id`). */
  private findMember(clubId: number, userId: number | string) {
    return User.query().where('club_id', clubId).where('id', userId).firstOrFail()
  }

  /** Liste des membres + invitations en attente. */
  async index({ inertia, auth, request, response, session }: HttpContext) {
    if (!MemberPolicy.manage(auth.user!)) {
      return deny({ session, response })
    }

    const clubId = auth.user!.clubId
    const members = await User.query().where('club_id', clubId).orderBy('created_at', 'asc')
    // `Invitation` est tenant-scopé → déjà filtré sur le club courant.
    const invitations = await Invitation.query()
      .whereNull('accepted_at')
      .orderBy('created_at', 'desc')

    return inertia.render('members/index', {
      members: members.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isSelf: u.id === auth.user!.id,
      })),
      invitations: invitations
        .filter((i) => i.isPending)
        .map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISO(),
          acceptUrl: this.acceptUrl(request, i.token),
        })),
    })
  }

  /** Crée une invitation (email + rôle) et prépare le lien d'acceptation. */
  async invite({ request, response, auth, session }: HttpContext) {
    if (!MemberPolicy.manage(auth.user!)) {
      return deny({ session, response })
    }

    const clubId = auth.user!.clubId
    const data = await request.validateUsing(invitationValidator)
    const email = normalizeEmail(data.email)

    // Déjà membre de CE club ? (l'email est unique en base ; on message clairement.)
    const already = await db
      .from('users')
      .where('club_id', clubId)
      .whereRaw('lower(email) = ?', [email])
      .select('id')
      .first()
    if (already) {
      session.flash('error', 'Cette personne est déjà membre du club.')
      return response.redirect().toRoute('members.index')
    }

    const invitation = await createInvitation({
      clubId,
      email,
      role: data.role,
      invitedByUserId: auth.user!.id,
    })

    await deliverInvitation(invitation, this.acceptUrl(request, invitation.token))

    session.flash('success', `Invitation créée pour ${email}. Le lien est prêt à être partagé.`)
    return response.redirect().toRoute('members.index')
  }

  /** Révoque une invitation en attente (scopée au club). */
  async revokeInvitation({ params, response, auth, session }: HttpContext) {
    if (!MemberPolicy.manage(auth.user!)) {
      return deny({ session, response })
    }

    const invitation = await Invitation.query().where('id', params.id).firstOrFail()
    await invitation.delete()

    session.flash('success', 'Invitation révoquée.')
    return response.redirect().toRoute('members.index')
  }

  /** Change le rôle d'un membre (garde : au moins un responsable). */
  async updateRole({ params, request, response, auth, session }: HttpContext) {
    if (!MemberPolicy.manage(auth.user!)) {
      return deny({ session, response })
    }

    const clubId = auth.user!.clubId
    const member = await this.findMember(clubId, params.id)
    const { role } = await request.validateUsing(memberRoleValidator)

    // Empêcher de rétrograder le dernier responsable.
    if (member.isOwner && role !== 'owner' && (await this.ownerCount(clubId)) <= 1) {
      session.flash('error', 'Le club doit garder au moins un responsable.')
      return response.redirect().toRoute('members.index')
    }

    member.role = role
    await member.save()

    session.flash('success', 'Rôle mis à jour.')
    return response.redirect().toRoute('members.index')
  }

  /** Retire un membre du club (pas soi-même ; jamais le dernier responsable). */
  async remove({ params, response, auth, session }: HttpContext) {
    if (!MemberPolicy.manage(auth.user!)) {
      return deny({ session, response })
    }

    const clubId = auth.user!.clubId
    const member = await this.findMember(clubId, params.id)

    if (member.id === auth.user!.id) {
      session.flash('error', 'Vous ne pouvez pas vous retirer vous-même.')
      return response.redirect().toRoute('members.index')
    }
    if (member.isOwner && (await this.ownerCount(clubId)) <= 1) {
      session.flash('error', 'Le club doit garder au moins un responsable.')
      return response.redirect().toRoute('members.index')
    }

    await member.delete()

    session.flash('success', `${member.email} a été retiré du club.`)
    return response.redirect().toRoute('members.index')
  }
}
