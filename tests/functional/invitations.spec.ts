import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Invitation from '#models/invitation'

/**
 * Invitations d'organisateurs (issue #35) : création par le responsable (lien +
 * jeton + expiration), acceptation publique, et rejet des liens expirés / déjà
 * acceptés. Contrôle d'accès : seul un `owner` peut inviter.
 */
test.group('Onboarding · invitations (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function ownerOf(suffix: string) {
    const club = await Club.create({ name: `Club ${suffix}`, slug: `club-${suffix}` })
    const user = await User.create({
      clubId: club.id,
      fullName: `Owner ${suffix}`,
      email: `owner-${suffix}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    return { club, user }
  }

  test('un owner invite et l’invité crée son compte organisateur', async ({ client, assert }) => {
    const { club, user } = await ownerOf('a')

    const inviteRes = await client
      .post('/membres/invitations')
      .form({ email: 'newbie@test.fixtura', role: 'organizer' })
      .loginAs(user)
      .redirects(0)
    inviteRes.assertStatus(302)

    const invitation = await Invitation.query().where('email', 'newbie@test.fixtura').firstOrFail()
    assert.isNull(invitation.acceptedAt)
    assert.isTrue(invitation.expiresAt > DateTime.now())

    const acceptRes = await client
      .post(`/invitations/${invitation.token}`)
      .form({ fullName: 'New Bie', password: 'password', passwordConfirmation: 'password' })
      .redirects(0)
    acceptRes.assertStatus(302)

    const created = await User.findBy('email', 'newbie@test.fixtura')
    assert.isNotNull(created)
    assert.equal(created!.role, 'organizer')
    assert.equal(created!.clubId, club.id)

    await invitation.refresh()
    assert.isNotNull(invitation.acceptedAt)
  })

  test('un lien expiré affiche l’écran « indisponible » et ne crée rien', async ({
    client,
    assert,
  }) => {
    const { club } = await ownerOf('b')
    const invitation = await Invitation.create({
      clubId: club.id,
      email: 'late@test.fixtura',
      role: 'organizer',
      token: 'token-expired-xyz',
      invitedByUserId: null,
      expiresAt: DateTime.now().minus({ days: 1 }),
      acceptedAt: null,
    })

    const show = await client.get(`/invitations/${invitation.token}`)
    show.assertStatus(200)
    show.assertTextIncludes('Invitation indisponible')

    const accept = await client
      .post(`/invitations/${invitation.token}`)
      .form({ fullName: 'Too Late', password: 'password', passwordConfirmation: 'password' })
    accept.assertStatus(200)

    const user = await User.findBy('email', 'late@test.fixtura')
    assert.isNull(user)
  })

  test('un lien déjà accepté est refusé', async ({ client }) => {
    const { club } = await ownerOf('c')
    const invitation = await Invitation.create({
      clubId: club.id,
      email: 'done@test.fixtura',
      role: 'organizer',
      token: 'token-accepted-xyz',
      invitedByUserId: null,
      expiresAt: DateTime.now().plus({ days: 5 }),
      acceptedAt: DateTime.now(),
    })

    const show = await client.get(`/invitations/${invitation.token}`)
    show.assertStatus(200)
    show.assertTextIncludes('Invitation indisponible')
  })

  test('un organizer ne peut pas inviter', async ({ client, assert }) => {
    const { club } = await ownerOf('d')
    const organizer = await User.create({
      clubId: club.id,
      fullName: 'Orga',
      email: 'orga-d@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    const res = await client
      .post('/membres/invitations')
      .form({ email: 'nope@test.fixtura', role: 'organizer' })
      .loginAs(organizer)
      .redirects(0)
    res.assertStatus(302)

    const invitation = await Invitation.query().where('email', 'nope@test.fixtura').first()
    assert.isNull(invitation)
  })
})
