import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Event from '#models/event'
import Tournament from '#models/tournament'
import Match from '#models/match'

/**
 * Test fonctionnel : un événement mêlant une catégorie **championnat** et une
 * catégorie **élimination directe** (#32, extension), sur un pool de terrains
 * partagé. Vérifie en base : les matchs de bracket sont persistés avec leurs
 * **sources différées** résolues (vainqueur/perdant → id DB réel), la finale/petite
 * finale sont ordonnancées **après** les demies, et aucune collision de terrain
 * entre catégories. Isolé par transaction.
 */
test.group('Événement · élimination directe (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function owner() {
    const club = await Club.create({ name: 'Club KO', slug: 'club-ko' })
    return User.create({
      clubId: club.id,
      fullName: 'Orga KO',
      email: 'orga-ko@test.fixtura',
      password: 'password',
      role: 'owner',
    })
  }

  test('championnat + élimination directe → bracket persisté et ordonnancé', async ({
    client: httpClient,
    assert,
  }) => {
    const user = await owner()

    // 1. Événement (pool de 2 terrains).
    await httpClient
      .post('/events')
      .form({
        name: 'Tournoi mixte',
        eventDate: '2026-09-15',
        startTime: '09:00',
        matchDurationMin: 15,
        breakDurationMin: 5,
        lunchDurationMin: 0,
        numTerrains: 2,
      })
      .loginAs(user)
      .redirects(0)
    const event = await Event.query().where('name', 'Tournoi mixte').firstOrFail()

    // 2a. Catégorie championnat.
    await httpClient
      .post(`/events/${event.id}/categories`)
      .form({ name: 'Champ U9', category: 'U9', format: 'championship' })
      .loginAs(user)
      .redirects(0)
    // 2b. Catégorie élimination directe avec petite finale.
    await httpClient
      .post(`/events/${event.id}/categories`)
      .form({ name: 'Coupe U11', category: 'U11', format: 'knockout', thirdPlace: true })
      .loginAs(user)
      .redirects(0)

    const champ = await Tournament.query()
      .where('event_id', event.id)
      .where('format', 'championship')
      .firstOrFail()
    const cup = await Tournament.query()
      .where('event_id', event.id)
      .where('format', 'knockout')
      .firstOrFail()

    // 3. Équipes (distinctes entre catégories).
    for (const name of ['A1', 'A2', 'A3', 'A4']) {
      await httpClient
        .post(`/tournaments/${champ.id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }
    for (const name of ['B1', 'B2', 'B3', 'B4']) {
      await httpClient
        .post(`/tournaments/${cup.id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }

    // 4. Génération + persistance du planning combiné.
    await httpClient.post(`/events/${event.id}/planning`).loginAs(user).redirects(0)

    // Championnat : 6 matchs (round-robin de 4).
    const champMatches = await Match.query().where('tournament_id', champ.id)
    assert.lengthOf(champMatches, 6)

    // Élimination directe : 2 demies + finale + petite finale = 4 matchs.
    const cupMatches = await Match.query().where('tournament_id', cup.id).orderBy('scheduled_at')
    assert.lengthOf(cupMatches, 4)

    const semis = cupMatches.filter((m) => m.bracketRound === 'sf')
    const final = cupMatches.find((m) => m.bracketRound === 'final')!
    const third = cupMatches.find((m) => m.bracketRound === 'third')!
    assert.lengthOf(semis, 2)
    assert.exists(final)
    assert.exists(third)

    // Demies : équipes concrètes connues.
    for (const sf of semis) {
      assert.equal(sf.stage, 'knockout')
      assert.isNotNull(sf.homeTeamId)
      assert.isNotNull(sf.awayTeamId)
    }

    // Finale : participants différés, sources « vainqueur de demie » résolues en id DB réels.
    assert.isNull(final.homeTeamId)
    assert.equal(final.homeSourceType, 'match_winner')
    assert.equal(final.awaySourceType, 'match_winner')
    const semiIds = semis.map((s) => s.id)
    assert.include(semiIds, final.homeSourceMatchId!)
    assert.include(semiIds, final.awaySourceMatchId!)

    // Petite finale : perdants des deux demies.
    assert.equal(third.homeSourceType, 'match_loser')
    assert.equal(third.awaySourceType, 'match_loser')
    assert.include(semiIds, third.homeSourceMatchId!)

    // Ordonnancement : finale ET petite finale APRÈS la fin des deux demies.
    const lastSemi = Math.max(...semis.map((s) => s.scheduledAt.toMillis()))
    assert.isAbove(final.scheduledAt.toMillis(), lastSemi)
    assert.isAbove(third.scheduledAt.toMillis(), lastSemi)

    // Aucune collision (créneau × terrain) entre les deux catégories sur le pool.
    const all = [...champMatches, ...cupMatches]
    const cells = new Set<string>()
    for (const m of all) {
      const cell = `${m.scheduledAt.toUTC().toISO()}#${m.terrainNumber}`
      assert.isFalse(cells.has(cell), `collision de terrain sur ${cell}`)
      cells.add(cell)
      assert.isAtMost(m.terrainNumber, event.numTerrains)
    }

    // 5. Écran public d'événement (SSR) — inclut le tableau final.
    const publicRes = await httpClient.get(`/e/${event.publicSlug}`)
    publicRes.assertStatus(200)
  })
})
