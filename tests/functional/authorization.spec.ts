import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'

/**
 * Autorisations par rôle (issue #34, policies). Les actions destructrices sont
 * réservées au responsable du club (`owner`) ; l'`organizer` fait tourner le jour J
 * mais ne supprime pas. Le cloisonnement par club, lui, est testé ailleurs
 * (`tenant_isolation`).
 */
test.group('autorisations · rôles & policies (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seed() {
    const club = await Club.create({ name: 'Club Auth', slug: 'club-auth' })
    const owner = await User.create({
      clubId: club.id,
      fullName: 'Owner',
      email: 'owner-auth@test.fixtura',
      password: 'password',
      role: 'owner',
    })
    const organizer = await User.create({
      clubId: club.id,
      fullName: 'Organizer',
      email: 'organizer-auth@test.fixtura',
      password: 'password',
      role: 'organizer',
    })
    const tournament = await Tournament.create({
      clubId: club.id,
      name: 'Tournoi Auth',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'draft',
      publicSlug: 'slug-auth',
      format: 'championship',
      formatConfig: null,
    })
    return { owner, organizer, tournament }
  }

  test('un organizer ne peut pas supprimer un tournoi', async ({ client, assert }) => {
    const { organizer, tournament } = await seed()

    // Refus gracieux : redirection (flash), pas de suppression.
    const res = await client.delete(`/tournaments/${tournament.id}`).loginAs(organizer).redirects(0)
    res.assertStatus(302)

    const stillThere = await Tournament.find(tournament.id)
    assert.isNotNull(stillThere)
  })

  test('un owner peut supprimer un tournoi', async ({ client, assert }) => {
    const { owner, tournament } = await seed()

    await client.delete(`/tournaments/${tournament.id}`).loginAs(owner).redirects(0)

    const gone = await Tournament.find(tournament.id)
    assert.isNull(gone)
  })
})
