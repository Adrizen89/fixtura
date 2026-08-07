import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Event from '#models/event'
import Tournament from '#models/tournament'
import Match from '#models/match'

/**
 * Test fonctionnel d'un **événement multi-catégories** (#32), de bout en bout via
 * HTTP : création de l'événement, ajout de catégories, équipes, génération du
 * planning **combiné** sur le pool de terrains partagé, puis rendu de l'écran public
 * d'événement. Vérifie en base la contrainte clé : aucune collision (créneau ×
 * terrain) entre catégories sur le pool partagé. Isolé par transaction.
 */
test.group('Cycle événement multi-catégories (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function owner() {
    const club = await Club.create({ name: 'Club Event', slug: 'club-event' })
    return User.create({
      clubId: club.id,
      fullName: 'Orga Event',
      email: 'orga-event@test.fixtura',
      password: 'password',
      role: 'owner',
    })
  }

  test('événement → catégories → équipes → planning combiné → écran public', async ({
    client: httpClient,
    assert,
  }) => {
    const user = await owner()

    // 1. Création de l'événement (pool de 3 terrains partagés).
    await httpClient
      .post('/events')
      .form({
        name: 'Journée jeunes',
        eventDate: '2026-09-01',
        startTime: '09:00',
        matchDurationMin: 10,
        breakDurationMin: 2,
        lunchDurationMin: 0,
        numTerrains: 3,
      })
      .loginAs(user)
      .redirects(0)

    const event = await Event.query().where('name', 'Journée jeunes').firstOrFail()
    assert.equal(event.clubId, user.clubId)
    assert.equal(event.numTerrains, 3)

    // 2. Deux catégories (championnat), 4 équipes chacune → 6 matchs chacune.
    for (const [name, category] of [
      ['Tournoi U9', 'U9'],
      ['Tournoi U11', 'U11'],
    ]) {
      await httpClient
        .post(`/events/${event.id}/categories`)
        .form({ name, category, format: 'championship' })
        .loginAs(user)
        .redirects(0)
    }

    const categories = await Tournament.query().where('event_id', event.id).orderBy('created_at')
    assert.lengthOf(categories, 2)

    // 3. Équipes de chaque catégorie (distinctes entre catégories).
    for (const name of ['A1', 'A2', 'A3', 'A4']) {
      await httpClient
        .post(`/tournaments/${categories[0].id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }
    for (const name of ['B1', 'B2', 'B3', 'B4']) {
      await httpClient
        .post(`/tournaments/${categories[1].id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }

    // 4. Génération + persistance du planning combiné.
    await httpClient.post(`/events/${event.id}/planning`).loginAs(user).redirects(0)

    const matches = await Match.query()
      .whereIn(
        'tournament_id',
        categories.map((c) => c.id)
      )
      .orderBy('scheduled_at')
      .orderBy('terrain_number')

    // 6 matchs par catégorie (round-robin de 4 équipes), 12 au total.
    assert.lengthOf(matches, 12)
    for (const c of categories) {
      assert.lengthOf(
        matches.filter((m) => m.tournamentId === c.id),
        6
      )
    }

    // Contrainte clé #32 : aucune collision (créneau × terrain) entre catégories.
    const cells = new Set<string>()
    const perSlot = new Map<string, number>()
    for (const m of matches) {
      const slot = m.scheduledAt.toUTC().toISO()!
      const cell = `${slot}#${m.terrainNumber}`
      assert.isFalse(cells.has(cell), `collision de terrain sur ${cell}`)
      cells.add(cell)
      assert.isAtLeast(m.terrainNumber, 1)
      assert.isAtMost(m.terrainNumber, event.numTerrains)
      perSlot.set(slot, (perSlot.get(slot) ?? 0) + 1)
    }
    // Jamais plus de matchs qu'il n'y a de terrains sur le pool partagé.
    for (const [, count] of perSlot) assert.isAtMost(count, event.numTerrains)

    // Statuts passés à « scheduled ».
    await event.refresh()
    assert.equal(event.status, 'scheduled')
    for (const c of categories) {
      await c.refresh()
      assert.equal(c.status, 'scheduled')
    }

    // 5. Écran public d'événement (lecture seule, sans auth) — rendu Inertia SSR.
    const publicRes = await httpClient.get(`/e/${event.publicSlug}`)
    publicRes.assertStatus(200)
  })
})
