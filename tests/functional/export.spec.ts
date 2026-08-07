import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'
import { generateFor, persistSchedule } from '#services/planning'

/**
 * Test fonctionnel des exports imprimables (planning, feuilles de match, classement —
 * issue #38). Exerce le rendu Edge autonome de bout en bout via HTTP (les erreurs de
 * template remontent en 500), le scoping club, et l'état « pas encore de planning ».
 */
test.group('Exports imprimables (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function makeClub(name: string, slug: string) {
    const club = await Club.create({ name, slug })
    const user = await User.create({
      clubId: club.id,
      fullName: `Orga ${name}`,
      email: `orga-${slug}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    return { club, user }
  }

  /** Tournoi championnat (4 équipes) avec planning persisté (6 matchs). */
  async function seedWithPlanning(clubId: number) {
    const tournament = await Tournament.create({
      clubId,
      name: 'Tournoi Export',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'draft',
      publicSlug: 'tournoi-export',
      format: 'championship',
      formatConfig: null,
    })
    await Team.createMany(
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((name) => ({ tournamentId: tournament.id, name }))
    )
    await tournament.load('teams')
    await persistSchedule(tournament, generateFor(tournament))
    return tournament
  }

  test('planning : rend un document imprimable avec les matchs', async ({ client, assert }) => {
    const { club, user } = await makeClub('Club A', 'club-a')
    const tournament = await seedWithPlanning(club.id)

    const res = await client.get(`/tournaments/${tournament.id}/export/planning`).loginAs(user)
    res.assertStatus(200)
    const html = res.text()
    assert.include(html, 'Tournoi Export')
    assert.include(html, 'Planning')
    assert.include(html, 'Alpha')
    assert.include(html, 'window.print()') // barre d'actions présente
  })

  test('feuilles de match : une feuille par match, score à remplir', async ({ client, assert }) => {
    const { club, user } = await makeClub('Club A', 'club-a')
    const tournament = await seedWithPlanning(club.id)

    const res = await client.get(`/tournaments/${tournament.id}/export/match-sheets`).loginAs(user)
    res.assertStatus(200)
    const html = res.text()
    assert.include(html, 'Feuilles de match')
    assert.include(html, 'Vainqueur')
    assert.include(html, 'Terrain')
    // 6 matchs (round-robin de 4 équipes) → 6 feuilles.
    assert.lengthOf(html.match(/class="sheet"/g) ?? [], 6)
  })

  test('classement : état vide sans résultat, puis table après un score', async ({
    client,
    assert,
  }) => {
    const { club, user } = await makeClub('Club A', 'club-a')
    const tournament = await seedWithPlanning(club.id)

    const before = await client.get(`/tournaments/${tournament.id}/export/standings`).loginAs(user)
    before.assertStatus(200)
    assert.include(before.text(), 'Aucun résultat')

    const match = await Match.query()
      .where('tournament_id', tournament.id)
      .orderBy('id')
      .firstOrFail()
    match.merge({ homeScore: 3, awayScore: 1, status: 'finished' })
    await match.save()

    const after = await client.get(`/tournaments/${tournament.id}/export/standings`).loginAs(user)
    after.assertStatus(200)
    const html = after.text()
    assert.notInclude(html, 'Aucun résultat')
    assert.include(html, 'Pts') // en-tête de la table de classement
    assert.include(html, 'Alpha')
  })

  test('sans planning : les exports planning / feuilles redirigent', async ({ client }) => {
    const { club, user } = await makeClub('Club A', 'club-a')
    const tournament = await Tournament.create({
      clubId: club.id,
      name: 'Sans Planning',
      category: 'U9',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'draft',
      publicSlug: 'sans-planning',
      format: 'championship',
      formatConfig: null,
    })

    const planning = await client
      .get(`/tournaments/${tournament.id}/export/planning`)
      .loginAs(user)
      .redirects(0)
    planning.assertStatus(302)

    const sheets = await client
      .get(`/tournaments/${tournament.id}/export/match-sheets`)
      .loginAs(user)
      .redirects(0)
    sheets.assertStatus(302)
  })

  test('scoping club : un autre club ne peut pas exporter (404)', async ({ client }) => {
    const { club } = await makeClub('Club A', 'club-a')
    const tournament = await seedWithPlanning(club.id)
    const { user: intruder } = await makeClub('Club B', 'club-b')

    const res = await client
      .get(`/tournaments/${tournament.id}/export/planning`)
      .loginAs(intruder)
      .redirects(0)
    res.assertStatus(404)
  })
})
