import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Invitation from '#models/invitation'
import User from '#models/user'
import { normalizeEmail } from '#models/user'
import type { UserRole } from '#models/user'

/**
 * Invitations d'organisateurs (issue #35) — logique métier isolée (cf. CLAUDE.md §8).
 * Un jeton non devinable + une expiration ; l'acceptation crée l'utilisateur dans
 * le club avec le rôle prévu et marque l'invitation comme acceptée.
 */

/** Durée de validité d'une invitation (jours). */
export const INVITATION_TTL_DAYS = 7

/** Jeton d'invitation non devinable (256 bits, URL-safe). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

export interface CreateInvitationInput {
  clubId: number
  email: string
  role: UserRole
  invitedByUserId: number | null
}

/**
 * Crée (ou remplace) une invitation en attente pour un email dans un club. Si une
 * invitation non acceptée existe déjà pour cet email, elle est régénérée (nouveau
 * jeton + nouvelle expiration) plutôt que dupliquée.
 */
export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  const email = normalizeEmail(input.email)
  const expiresAt = DateTime.now().plus({ days: INVITATION_TTL_DAYS })

  const existing = await Invitation.query()
    .where('club_id', input.clubId)
    .where('email', email)
    .whereNull('accepted_at')
    .first()

  if (existing) {
    existing.merge({
      role: input.role,
      token: generateInvitationToken(),
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    await existing.save()
    return existing
  }

  return Invitation.create({
    clubId: input.clubId,
    email,
    role: input.role,
    token: generateInvitationToken(),
    invitedByUserId: input.invitedByUserId,
    expiresAt,
    acceptedAt: null,
  })
}

export interface AcceptInvitationInput {
  fullName: string
  password: string
}

/**
 * Accepte une invitation : crée l'utilisateur (club + rôle de l'invitation) et
 * marque l'invitation acceptée, dans une transaction. L'appelant doit avoir vérifié
 * `invitation.isPending` et l'absence d'un compte pour cet email au préalable.
 */
export async function acceptInvitation(
  invitation: Invitation,
  input: AcceptInvitationInput
): Promise<User> {
  return db.transaction(async (trx) => {
    const user = await User.create(
      {
        clubId: invitation.clubId,
        fullName: input.fullName.trim(),
        email: invitation.email,
        password: input.password,
        role: invitation.role,
      },
      { client: trx }
    )

    invitation.useTransaction(trx)
    invitation.acceptedAt = DateTime.now()
    await invitation.save()

    return user
  })
}
