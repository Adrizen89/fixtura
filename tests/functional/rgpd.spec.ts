import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'
import { exportClubData, deleteClubData } from '#services/club_data'

/**
 * Portabilité (export) et effacement (suppression) des données d'un club
 * (RGPD art. 20 & 17 — cf. CLAUDE.md §10 · issue #36).
 *
 * Vérifie le cloisonnement multi-tenant (on ne touche/exporte jamais un autre club),
 * l'exclusion du hash de mot de passe, le contrôle d'accès (owner-only) de l'export
 * web, et le décompte exact de la suppression. Isolé par transaction.
 */
test.group('RGPD · export & suppression (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  /** Crée un club complet : owner + un tournoi avec 2 équipes et 1 match joué. */
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
      publicSlug: `slug-${suffix}`,
      format: 'championship',
      formatConfig: null,
    })
    const teamA = await Team.create({ tournamentId: tournament.id, name: `Équipe A ${suffix}` })
    const teamB = await Team.create({ tournamentId: tournament.id, name: `Équipe B ${suffix}` })
    await Match.create({
      tournamentId: tournament.id,
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.fromISO('2026-09-01T09:00:00'),
      homeTeamId: teamA.id,
      awayTeamId: teamB.id,
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      stage: 'main',
    })
    return { club, owner }
  }

  test("l'owner exporte les données de son club (JSON, sans mot de passe)", async ({
    client,
    assert,
  }) => {
    const { owner } = await seedClub('a')

    const res = await client.get('/compte/export').loginAs(owner)
    res.assertStatus(200)
    res.assertHeader('content-type', 'application/json; charset=utf-8')

    const body = res.body()
    assert.equal(body.meta.format, 'fixtura-club-export')
    assert.lengthOf(body.users, 1)
    // Le hash de mot de passe ne doit jamais sortir.
    assert.notProperty(body.users[0], 'password')
    assert.lengthOf(body.tournaments, 1)
    assert.lengthOf(body.tournaments[0].teams, 2)
    assert.lengthOf(body.tournaments[0].matches, 1)
  })

  test("l'export ne contient que les données du club de l'owner", async ({ client, assert }) => {
    const { owner } = await seedClub('a')
    await seedClub('b') // club voisin, ne doit pas fuiter

    const res = await client.get('/compte/export').loginAs(owner)
    res.assertStatus(200)

    const body = res.body()
    assert.lengthOf(body.tournaments, 1)
    assert.equal(body.club.slug, 'club-a')
    assert.equal(body.tournaments[0].name, 'Tournoi a')
  })

  test('un organizer (non owner) ne peut pas exporter', async ({ client }) => {
    const { club } = await seedClub('a')
    const organizer = await User.create({
      clubId: club.id,
      fullName: 'Orga simple',
      email: 'orga-simple@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    const res = await client.get('/compte/export').loginAs(organizer)
    res.assertStatus(403)
  })

  test('un visiteur non authentifié est redirigé', async ({ client }) => {
    const res = await client.get('/compte/export').redirects(0)
    res.assertStatus(302)
  })

  test('deleteClubData supprime tout le club et respecte le cloisonnement', async ({ assert }) => {
    const { club: clubA } = await seedClub('a')
    const { club: clubB } = await seedClub('b')

    const report = await deleteClubData(clubA.id)

    assert.deepEqual(report, {
      clubId: clubA.id,
      matches: 1,
      teams: 2,
      tournaments: 1,
      users: 1,
      club: 1,
    })

    // Club A entièrement effacé.
    const remainingUsersA = await User.query().where('club_id', clubA.id)
    const remainingTournamentsA = await Tournament.query().where('club_id', clubA.id)
    assert.isNull(await Club.find(clubA.id))
    assert.lengthOf(remainingUsersA, 0)
    assert.lengthOf(remainingTournamentsA, 0)

    // Club B intact.
    const remainingTournamentsB = await Tournament.query().where('club_id', clubB.id)
    assert.isNotNull(await Club.find(clubB.id))
    assert.lengthOf(remainingTournamentsB, 1)
  })

  test('exportClubData reflète le contenu du club', async ({ assert }) => {
    const { club } = await seedClub('a')

    const data = await exportClubData(club.id, '2026-08-07T10:00:00.000+02:00')

    assert.equal(data.meta.version, 1)
    assert.equal(data.club.name, 'Club a')
    assert.lengthOf(data.tournaments, 1)
    assert.lengthOf(data.tournaments[0].teams as unknown[], 2)
  })
})
