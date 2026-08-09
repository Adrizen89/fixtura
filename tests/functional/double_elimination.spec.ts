import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Match from '#models/match'

/**
 * Double élimination (issue #111) — intégration bout-en-bout via HTTP.
 *
 * Exerce le runtime : contrainte de format (migration), dispatch du scheduler,
 * persistance des matchs à participants différés, et **progression** (descente des
 * perdants du tableau principal vers le repêchage). Isolé par transaction.
 */
test.group('Double élimination (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function owner() {
    const club = await Club.create({ name: 'Club DE', slug: 'club-de' })
    return User.create({
      clubId: club.id,
      fullName: 'Orga DE',
      email: 'orga-de@test.fixtura',
      password: 'password',
      role: 'owner',
    })
  }

  test('création → planning → progression du repêchage', async ({ client, assert }) => {
    const user = await owner()

    // 1. Création d'un tournoi en double élimination (valide la contrainte de format).
    await client
      .post('/tournaments')
      .form({
        name: 'Coupe DE',
        category: 'U13',
        eventDate: '2026-09-01',
        startTime: '09:00',
        matchDurationMin: 10,
        breakDurationMin: 2,
        lunchDurationMin: 0,
        numTerrains: 2,
        format: 'double_elimination',
      })
      .loginAs(user)
      .redirects(0)

    const tournament = await Tournament.query().where('name', 'Coupe DE').firstOrFail()
    assert.equal(tournament.format, 'double_elimination')

    // 2. Quatre équipes → 2N−2 = 6 matchs (tableau principal + repêchage + grande finale).
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
      await client
        .post(`/tournaments/${tournament.id}/teams`)
        .loginAs(user)
        .form({ name })
        .redirects(0)
    }

    // 3. Génération + persistance du planning.
    await client.post(`/tournaments/${tournament.id}/planning`).loginAs(user).redirects(0)
    const matches = await Match.query().where('tournament_id', tournament.id)
    assert.lengthOf(matches, 6)

    const rounds = matches.map((m) => m.bracketRound)
    assert.includeMembers(rounds, ['wb-r1', 'wb-r2', 'lb-r1', 'lb-r2', 'gf'])

    // 4. Progression : on règle les deux matchs du 1er tour principal (le domicile gagne).
    const wbR1 = matches.filter((m) => m.bracketRound === 'wb-r1')
    assert.lengthOf(wbR1, 2)
    const losers = new Set(wbR1.map((m) => m.awayTeamId)) // le perdant = l'équipe extérieure
    for (const m of wbR1) {
      await client
        .patch(`/tournaments/${tournament.id}/matches/${m.id}`)
        .loginAs(user)
        .form({ homeScore: 1, awayScore: 0 })
        .redirects(0)
    }

    // 5. Le 1er tour de repêchage a reçu les deux perdants (slots différés résolus).
    const lbR1 = await Match.query()
      .where('tournament_id', tournament.id)
      .where('bracket_round', 'lb-r1')
      .firstOrFail()
    assert.isNotNull(lbR1.homeTeamId)
    assert.isNotNull(lbR1.awayTeamId)
    assert.sameMembers([lbR1.homeTeamId, lbR1.awayTeamId], [...losers])
  })
})
