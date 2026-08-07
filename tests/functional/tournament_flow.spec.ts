import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Test fonctionnel du cycle complet d'un tournoi (championnat), de bout en bout
 * via HTTP. Exerce le runtime non couvert par les tests unitaires : validation
 * VineJS 4, persistance Lucid 22, génération du planning, saisie de score,
 * forfait, et rendu de l'écran public (Inertia SSR). Isolé par transaction.
 */
test.group('Cycle tournoi (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function owner() {
    const club = await Club.create({ name: 'Club Flow', slug: 'club-flow' })
    return User.create({
      clubId: club.id,
      fullName: 'Orga Flow',
      email: 'orga-flow@test.fixtura',
      password: 'password',
      role: 'owner',
    })
  }

  test('création → équipes → planning → score → forfait → écran public', async ({
    client,
    assert,
  }) => {
    const user = await owner()

    // 1. Création d'un tournoi (championnat).
    await client
      .post('/tournaments')
      .form({
        name: 'Tournoi Flow',
        category: 'U11',
        eventDate: '2026-09-01',
        startTime: '09:00',
        matchDurationMin: 10,
        breakDurationMin: 2,
        lunchDurationMin: 30,
        numTerrains: 2,
        format: 'championship',
      })
      .loginAs(user)
      .redirects(0)

    const tournament = await Tournament.query().where('name', 'Tournoi Flow').firstOrFail()
    assert.equal(tournament.clubId, user.clubId)

    // 2. Ajout de 4 équipes (round-robin → 6 matchs).
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
      await client
        .post(`/tournaments/${tournament.id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }
    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 4)

    // 3. Génération + persistance du planning.
    await client.post(`/tournaments/${tournament.id}/planning`).loginAs(user).redirects(0)
    const matches = await Match.query()
      .where('tournament_id', tournament.id)
      .orderBy('scheduled_at')
      .orderBy('terrain_number')
    assert.lengthOf(matches, 6)

    // 4. Saisie d'un score réel.
    const first = matches[0]
    await client
      .patch(`/tournaments/${tournament.id}/matches/${first.id}`)
      .loginAs(user)
      .form({ homeScore: 3, awayScore: 1 })
      .redirects(0)
    await first.refresh()
    assert.equal(first.homeScore, 3)
    assert.equal(first.awayScore, 1)
    assert.equal(first.status, 'finished')

    // 5. Forfait sur un autre match (défaite réglementaire 3–0 pour le côté forfaitaire).
    const second = matches[1]
    await client
      .patch(`/tournaments/${tournament.id}/matches/${second.id}/forfeit`)
      .loginAs(user)
      .form({ side: 'home' })
      .redirects(0)
    await second.refresh()
    assert.equal(second.status, 'forfeit')
    assert.equal(second.homeScore, 0)
    assert.equal(second.awayScore, 3)

    // 6. Écran public (lecture seule, sans auth) — rendu Inertia SSR.
    const publicRes = await client.get(`/t/${tournament.publicSlug}`)
    publicRes.assertStatus(200)
  })
})
