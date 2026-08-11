import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import Tournament from '#models/tournament'
import Event from '#models/event'
import Team from '#models/team'
import Match from '#models/match'

/**
 * API de lecture publique (issue #122) — vérifie le contrat JSON versionné,
 * lecture seule, via `public_slug` : structure stable, données publiques
 * uniquement, et 404 propre sur un slug inconnu. Isolé par transaction.
 */
test.group('API publique (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function club() {
    return Club.create({ name: 'Club API', slug: 'club-api' })
  }

  /** Tournoi terminé : Alpha bat Bravo 2–0 (un match joué). */
  async function finishedTournament(clubId: number, slug: string, eventId: number | null = null) {
    const tournament = await Tournament.create({
      clubId,
      eventId,
      name: 'Tournoi API',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-06-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'finished',
      publicSlug: slug,
      format: 'championship',
      formatConfig: null,
    })
    const alpha = await Team.create({ tournamentId: tournament.id, name: 'Alpha' })
    const bravo = await Team.create({ tournamentId: tournament.id, name: 'Bravo' })
    await Match.create({
      tournamentId: tournament.id,
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.fromISO('2026-06-01T09:00:00'),
      homeTeamId: alpha.id,
      awayTeamId: bravo.id,
      homeScore: 2,
      awayScore: 0,
      status: 'finished',
      stage: 'main',
    })
    return tournament
  }

  test('GET /api/v1/tournaments/:slug renvoie le contrat JSON versionné', async ({
    client,
    assert,
  }) => {
    const c = await club()
    await finishedTournament(c.id, 'slug-api-t')

    const res = await client.get('/api/v1/tournaments/slug-api-t')
    res.assertStatus(200)

    const body = res.body()
    assert.equal(body.apiVersion, '1')
    assert.equal(body.club.name, 'Club API')
    assert.equal(body.tournament.slug, 'slug-api-t')
    assert.equal(body.tournament.format, 'championship')
    assert.lengthOf(body.standings, 2)
    assert.equal(body.standings[0].team, 'Alpha') // 1er (a gagné)
    assert.equal(body.standings[0].points, 3)
    assert.lengthOf(body.matches, 1)
    assert.equal(body.matches[0].homeScore, 2)
    assert.equal(body.matches[0].status, 'finished')

    // Aucune donnée privée ne fuite.
    assert.notProperty(body.matches[0], 'updatedBy')
    assert.notProperty(body.standings[0], 'teamId')
  })

  test('slug de tournoi inconnu → 404 JSON', async ({ client }) => {
    const res = await client.get('/api/v1/tournaments/inexistant')
    res.assertStatus(404)
  })

  test('GET /api/v1/events/:slug agrège les catégories', async ({ client, assert }) => {
    const c = await club()
    const event = await Event.create({
      clubId: c.id,
      name: 'Événement API',
      eventDate: DateTime.fromISO('2026-06-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'live',
      publicSlug: 'slug-api-e',
    })
    await finishedTournament(c.id, 'slug-api-cat', event.id)

    const res = await client.get('/api/v1/events/slug-api-e')
    res.assertStatus(200)

    const body = res.body()
    assert.equal(body.apiVersion, '1')
    assert.equal(body.event.slug, 'slug-api-e')
    assert.lengthOf(body.categories, 1)
    assert.lengthOf(body.categories[0].standings, 2)
    assert.equal(body.categories[0].matches[0].homeScore, 2)
  })

  test('slug d’événement inconnu → 404 JSON', async ({ client }) => {
    const res = await client.get('/api/v1/events/inexistant')
    res.assertStatus(404)
  })
})
