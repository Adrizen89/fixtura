import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'

/**
 * Gestion des membres (issue #35) : lister, changer de rôle, retirer — réservé au
 * responsable (`owner`), avec la garde « au moins un responsable » et
 * l'interdiction de se retirer soi-même.
 */
test.group('Onboarding · gestion des membres (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function club() {
    const c = await Club.create({ name: 'Club Membres', slug: 'club-membres' })
    const owner = await User.create({
      clubId: c.id,
      fullName: 'Owner',
      email: 'owner@test.fixtura',
      password: 'password',
      role: 'owner',
    })
    const organizer = await User.create({
      clubId: c.id,
      fullName: 'Orga',
      email: 'orga@test.fixtura',
      password: 'password',
      role: 'organizer',
    })
    return { c, owner, organizer }
  }

  test('le responsable liste les membres', async ({ client }) => {
    const { owner } = await club()
    const res = await client.get('/membres').loginAs(owner)
    res.assertStatus(200)
    res.assertTextIncludes('orga@test.fixtura')
  })

  test('un organizer n’accède pas à la gestion des membres', async ({ client }) => {
    const { organizer } = await club()
    const res = await client.get('/membres').loginAs(organizer).redirects(0)
    res.assertStatus(302)
  })

  test('le responsable change le rôle d’un membre', async ({ client, assert }) => {
    const { owner, organizer } = await club()

    await client
      .patch(`/membres/${organizer.id}/role`)
      .form({ role: 'owner' })
      .loginAs(owner)
      .redirects(0)

    await organizer.refresh()
    assert.equal(organizer.role, 'owner')
  })

  test('le club garde au moins un responsable (pas d’auto-rétrogradation)', async ({
    client,
    assert,
  }) => {
    const { owner } = await club()

    await client
      .patch(`/membres/${owner.id}/role`)
      .form({ role: 'organizer' })
      .loginAs(owner)
      .redirects(0)

    await owner.refresh()
    assert.equal(owner.role, 'owner')
  })

  test('le responsable retire un membre', async ({ client, assert }) => {
    const { owner, organizer } = await club()

    await client.delete(`/membres/${organizer.id}`).loginAs(owner).redirects(0)

    const gone = await User.find(organizer.id)
    assert.isNull(gone)
  })

  test('on ne peut pas se retirer soi-même', async ({ client, assert }) => {
    const { owner } = await club()

    await client.delete(`/membres/${owner.id}`).loginAs(owner).redirects(0)

    const stillThere = await User.find(owner.id)
    assert.isNotNull(stillThere)
  })

  test('isolation : le responsable ne gère pas un membre d’un autre club', async ({
    client,
    assert,
  }) => {
    const { owner } = await club()
    const otherClub = await Club.create({ name: 'Autre', slug: 'autre' })
    const foreign = await User.create({
      clubId: otherClub.id,
      fullName: 'Étranger',
      email: 'foreign@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    const res = await client.delete(`/membres/${foreign.id}`).loginAs(owner).redirects(0)
    res.assertStatus(404)

    const stillThere = await User.find(foreign.id)
    assert.isNotNull(stillThere)
  })
})
