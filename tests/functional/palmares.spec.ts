import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import type { TournamentStatus } from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Palmarès (issue #109) — affichage admin agrégé sur l'historique du club.
 *
 * Vérifie via HTTP : le rendu du palmarès (vainqueur d'une édition terminée) et le
 * cloisonnement par club (scope global automatique, issue #34) — un club ne voit
 * jamais les équipes/vainqueurs d'un autre. Isolé par transaction.
 */
test.group('Palmarès (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seedClub(suffix: string) {
    const club = await Club.create({ name: `Club ${suffix}`, slug: `club-${suffix}` })
    const owner = await User.create({
      clubId: club.id,
      fullName: `Owner ${suffix}`,
      email: `owner-${suffix}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    return { club, owner }
  }

  /** Tournoi terminé (championnat) : `winner` bat `loser` 3–0 sur un match joué. */
  async function finishedTournament(clubId: number, name: string, winner: string, loser: string) {
    const tournament = await Tournament.create({
      clubId,
      name,
      category: 'U11',
      eventDate: DateTime.fromISO('2026-06-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'finished' as TournamentStatus,
      publicSlug: `slug-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      format: 'championship',
      formatConfig: null,
    })
    const home = await Team.create({ tournamentId: tournament.id, name: winner })
    const away = await Team.create({ tournamentId: tournament.id, name: loser })
    await Match.create({
      tournamentId: tournament.id,
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.fromISO('2026-06-01T09:00:00'),
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: 3,
      awayScore: 0,
      status: 'finished',
      stage: 'main',
    })
    return tournament
  }

  test('affiche le vainqueur d’une édition terminée', async ({ client, assert }) => {
    const { club, owner } = await seedClub('pal')
    await finishedTournament(club.id, 'Tournoi Printemps', 'Les Aigles', 'Les Lions')

    const res = await client.get('/palmares').loginAs(owner)
    res.assertStatus(200)
    assert.include(res.text(), 'Tournoi Printemps')
    assert.include(res.text(), 'Les Aigles') // vainqueur
    assert.include(res.text(), 'Les Lions') // finaliste
  })

  test('cloisonnement par club : un club ne voit que son propre palmarès', async ({
    client,
    assert,
  }) => {
    const a = await seedClub('a')
    const b = await seedClub('b')
    await finishedTournament(a.club.id, 'Coupe A', 'Aigles A', 'Lions A')
    await finishedTournament(b.club.id, 'Coupe B', 'Aigles B', 'Lions B')

    const res = await client.get('/palmares').loginAs(a.owner)
    res.assertStatus(200)
    assert.include(res.text(), 'Aigles A')
    assert.notInclude(res.text(), 'Aigles B')
    assert.notInclude(res.text(), 'Coupe B')
  })
})
