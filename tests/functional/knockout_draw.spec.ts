import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'
import { generatePhasedFor, persistPhasedSchedule } from '#services/planning'

/**
 * Résolution d'un nul en élimination directe (issue #105). Exerce le chemin complet
 * via HTTP : un nul en demi-finale sans vainqueur t.a.b. est refusé (match non réglé,
 * bracket bloqué) ; avec un vainqueur désigné, le match est réglé et le vainqueur
 * remonte en finale.
 */
test.group('Nul en élimination → tirs au but (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seedKnockout() {
    const club = await Club.create({ name: 'Club KO', slug: 'club-ko' })
    const user = await User.create({
      clubId: club.id,
      fullName: 'Orga KO',
      email: 'orga-ko@test.fixtura',
      password: 'password',
      role: 'owner',
    })
    const tournament = await Tournament.create({
      clubId: club.id,
      name: 'Coupe',
      category: 'U13',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 12,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'draft',
      publicSlug: 'coupe-ko',
      format: 'knockout',
      formatConfig: { thirdPlace: false },
    })
    await Team.createMany(
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((name) => ({ tournamentId: tournament.id, name }))
    )
    await tournament.load('teams')
    await persistPhasedSchedule(tournament, generatePhasedFor(tournament))
    return { user, tournament }
  }

  test('nul en demie : vainqueur requis, puis le vainqueur t.a.b. remonte en finale', async ({
    client,
    assert,
  }) => {
    const { user, tournament } = await seedKnockout()

    const ko = await Match.query().where('tournament_id', tournament.id).where('stage', 'knockout')
    // Demi-finales = matchs à équipes concrètes ; finale = slots différés.
    const semis = ko.filter((m) => m.homeTeamId !== null && m.awayTeamId !== null)
    const final = ko.find((m) => m.homeTeamId === null || m.awayTeamId === null)!
    assert.lengthOf(semis, 2)

    const [semi1, semi2] = semis
    const base = `/tournaments/${tournament.id}/matches`

    // 1. Nul sans vainqueur désigné → refusé : le match reste non réglé.
    await client.patch(`${base}/${semi1.id}`).loginAs(user).form({ homeScore: 1, awayScore: 1 })
    await semi1.refresh()
    assert.equal(semi1.status, 'scheduled')
    assert.isNull(semi1.shootoutWinnerTeamId)

    // 2. Nul avec vainqueur t.a.b. (domicile) → réglé, vainqueur mémorisé.
    await client
      .patch(`${base}/${semi1.id}`)
      .loginAs(user)
      .form({ homeScore: 1, awayScore: 1, shootoutWinner: 'home' })
    await semi1.refresh()
    assert.equal(semi1.status, 'finished')
    assert.equal(semi1.shootoutWinnerTeamId, semi1.homeTeamId)

    // La finale doit désormais porter le vainqueur de la demie #1 dans le bon slot.
    await final.refresh()
    if (final.homeSourceMatchId === semi1.id) {
      assert.equal(final.homeTeamId, semi1.homeTeamId)
    } else {
      assert.equal(final.awayTeamId, semi1.homeTeamId)
    }

    // 3. L'autre demie, décidée au score, remplit l'autre slot de la finale.
    await client.patch(`${base}/${semi2.id}`).loginAs(user).form({ homeScore: 3, awayScore: 0 })
    await semi2.refresh()
    await final.refresh()
    assert.equal(semi2.status, 'finished')
    assert.isNotNull(final.homeTeamId)
    assert.isNotNull(final.awayTeamId)
  })
})
