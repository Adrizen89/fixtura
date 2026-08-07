import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Event from '#models/event'

/**
 * Isolation stricte multi-tenant (issue #34) : un club ne voit **jamais** les
 * données d'un autre. Exerce le scope global automatique (`TenantContext` + mixin
 * `withTenantScope`) de bout en bout via HTTP — sans aucun `forClub` dans les
 * contrôleurs. Couvre la lecture (liste filtrée, accès direct → 404) et l'écriture
 * (suppression cross-club impossible).
 */
test.group('multi-tenant · isolation stricte (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  /** Club complet : owner + un tournoi autonome + un événement. */
  async function seedClub(suffix: string) {
    const club = await Club.create({ name: `Club ${suffix}`, slug: `club-${suffix}` })
    const owner = await User.create({
      clubId: club.id,
      fullName: `Owner ${suffix}`,
      email: `owner-${suffix}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    const tournament = await Tournament.create({
      clubId: club.id,
      name: `Tournoi ${suffix}`,
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'draft',
      publicSlug: `slug-t-${suffix}`,
      format: 'championship',
      formatConfig: null,
    })
    const event = await Event.create({
      clubId: club.id,
      name: `Événement ${suffix}`,
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'draft',
      publicSlug: `slug-e-${suffix}`,
    })
    return { club, owner, tournament, event }
  }

  test('la liste des tournois ne montre que le club courant', async ({ client, assert }) => {
    const a = await seedClub('a')
    await seedClub('b')

    const res = await client.get('/tournaments').loginAs(a.owner)
    res.assertStatus(200)
    assert.include(res.text(), 'Tournoi a')
    assert.notInclude(res.text(), 'Tournoi b')
  })

  test('accès direct au tournoi d’un autre club → 404', async ({ client }) => {
    const a = await seedClub('a')
    const b = await seedClub('b')

    for (const path of [
      `/tournaments/${b.tournament.id}`,
      `/tournaments/${b.tournament.id}/edit`,
      `/tournaments/${b.tournament.id}/results`,
    ]) {
      const res = await client.get(path).loginAs(a.owner)
      res.assertStatus(404)
    }
    // Le tournoi du propre club reste accessible.
    const own = await client.get(`/tournaments/${a.tournament.id}`).loginAs(a.owner)
    own.assertStatus(200)
  })

  test('la liste des événements ne montre que le club courant', async ({ client, assert }) => {
    const a = await seedClub('a')
    await seedClub('b')

    const res = await client.get('/events').loginAs(a.owner)
    res.assertStatus(200)
    assert.include(res.text(), 'Événement a')
    assert.notInclude(res.text(), 'Événement b')
  })

  test('accès direct à l’événement d’un autre club → 404', async ({ client }) => {
    const a = await seedClub('a')
    const b = await seedClub('b')

    const foreign = await client.get(`/events/${b.event.id}`).loginAs(a.owner)
    foreign.assertStatus(404)
    const own = await client.get(`/events/${a.event.id}`).loginAs(a.owner)
    own.assertStatus(200)
  })

  test('suppression cross-club impossible (404, la donnée survit)', async ({ client, assert }) => {
    const a = await seedClub('a')
    const b = await seedClub('b')

    // owner A (autorisé à supprimer dans SON club) ne peut pas atteindre le tournoi B.
    const res = await client.delete(`/tournaments/${b.tournament.id}`).loginAs(a.owner)
    res.assertStatus(404)

    const stillThere = await Tournament.find(b.tournament.id)
    assert.isNotNull(stillThere)
  })
})
