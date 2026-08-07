import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Invitation from '#models/invitation'
import { generateInvitationToken, INVITATION_TTL_DAYS } from '#services/invitations'

/**
 * Jeton et statut d'une invitation (issue #35) — logique pure, sans DB.
 */
test.group('Onboarding · jeton d’invitation', () => {
  test('génère un jeton URL-safe et unique', ({ assert }) => {
    const a = generateInvitationToken()
    const b = generateInvitationToken()

    assert.match(a, /^[A-Za-z0-9_-]+$/)
    assert.isAbove(a.length, 20)
    assert.notEqual(a, b)
  })

  test('la durée de validité est positive', ({ assert }) => {
    assert.isAbove(INVITATION_TTL_DAYS, 0)
  })
})

test.group('Onboarding · statut d’invitation', () => {
  /** Construit une invitation en mémoire (sans persistance) pour tester les getters. */
  function make(expiresAt: DateTime, acceptedAt: DateTime | null) {
    const invitation = new Invitation()
    invitation.expiresAt = expiresAt
    invitation.acceptedAt = acceptedAt
    return invitation
  }

  test('en attente : ni acceptée ni expirée', ({ assert }) => {
    const invitation = make(DateTime.now().plus({ days: 1 }), null)
    assert.isTrue(invitation.isPending)
    assert.isFalse(invitation.isExpired)
    assert.isFalse(invitation.isAccepted)
  })

  test('expirée : plus en attente', ({ assert }) => {
    const invitation = make(DateTime.now().minus({ minutes: 1 }), null)
    assert.isTrue(invitation.isExpired)
    assert.isFalse(invitation.isPending)
  })

  test('acceptée : plus en attente', ({ assert }) => {
    const invitation = make(DateTime.now().plus({ days: 1 }), DateTime.now())
    assert.isTrue(invitation.isAccepted)
    assert.isFalse(invitation.isPending)
  })
})
