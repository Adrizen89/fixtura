import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'
import { buildResultsData } from '#services/tournament_results'

/**
 * Système suisse (issue #110) — flux de bout en bout via HTTP : génération de la
 * ronde 1, génération **automatique** de la ronde suivante à la saisie des scores
 * (sans rematch), gestion du bye, et fin du tournoi après le nombre de rondes.
 */
test.group('Système suisse — flux (#110)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function makeOwner() {
    const club = await Club.create({ name: 'Club A', slug: 'club-a' })
    const owner = await User.create({
      clubId: club.id,
      fullName: 'Owner',
      email: 'owner@test.fixtura',
      password: 'password',
      role: 'owner',
    })
    return { club, owner }
  }

  async function makeSwissTournament(
    clubId: number,
    teamNames: string[],
    swissRounds: number | null = null
  ) {
    const tournament = await Tournament.create({
      clubId,
      name: 'Tournoi Suisse',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 0,
      numTerrains: 2,
      status: 'draft',
      publicSlug: `swiss-${clubId}-${teamNames.length}`,
      format: 'swiss',
      formatConfig: swissRounds ? { swissRounds } : null,
    })
    // Ids croissants = ordre de tête de série (déterministe).
    for (const name of teamNames) {
      await Team.create({ tournamentId: tournament.id, name })
    }
    return tournament
  }

  /** Recharge un tournoi avec ses équipes (pour buildResultsData / progression). */
  function reload(id: number) {
    return Tournament.query().where('id', id).preload('teams').firstOrFail()
  }

  test('génère la ronde 1 (N pair) : appariements par tête de série, aucun bye', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeOwner()
    const t = await makeSwissTournament(club.id, ['A', 'B', 'C', 'D'])

    const res = await client.post(`/tournaments/${t.id}/planning`).loginAs(owner).redirects(0)
    res.assertStatus(302)

    const matches = await Match.query().where('tournament_id', t.id)
    assert.lengthOf(matches, 2)
    assert.isTrue(matches.every((m) => m.roundNumber === 1 && m.stage === 'swiss'))
    assert.isTrue(matches.every((m) => m.awayTeamId !== null)) // pas de bye
  })

  test('la ronde suivante est générée automatiquement à la saisie des scores, sans rematch', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeOwner()
    const t = await makeSwissTournament(club.id, ['A', 'B', 'C', 'D'])
    await client.post(`/tournaments/${t.id}/planning`).loginAs(owner).redirects(0)

    const round1 = await Match.query().where('tournament_id', t.id).where('round_number', 1)
    // Saisie de tous les scores de la ronde 1 (chaque « domicile » gagne 1-0).
    for (const m of round1) {
      await client
        .patch(`/tournaments/${t.id}/matches/${m.id}`)
        .loginAs(owner)
        .json({ homeScore: 1, awayScore: 0 })
        .redirects(0)
    }

    const round2 = await Match.query().where('tournament_id', t.id).where('round_number', 2)
    assert.lengthOf(round2, 2) // ronde 2 auto-générée

    // Aucun rematch : les paires de la ronde 2 diffèrent de celles de la ronde 1.
    const key = (m: Match) =>
      [m.homeTeamId, m.awayTeamId].sort((a, b) => (a ?? 0) - (b ?? 0)).join('-')
    const r1 = new Set(round1.map(key))
    for (const m of round2) assert.isFalse(r1.has(key(m)))
  })

  test('bye (N impair) : la moins bien classée est exemptée, victoire d’office au classement', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeOwner()
    const t = await makeSwissTournament(club.id, ['A', 'B', 'C', 'D', 'E'])
    await client.post(`/tournaments/${t.id}/planning`).loginAs(owner).redirects(0)

    const round1 = await Match.query().where('tournament_id', t.id).where('round_number', 1)
    const byes = round1.filter((m) => m.awayTeamId === null)
    assert.lengthOf(byes, 1) // un seul bye
    assert.equal(byes[0].status, 'finished') // réglé d'office
    assert.lengthOf(
      round1.filter((m) => m.awayTeamId !== null),
      2
    )

    // Le classement crédite le bye : 1 match joué, 3 points, avant tout autre score.
    const results = await buildResultsData(await reload(t.id))
    const byeRow = results.standings.find((r) => r.teamId === byes[0].homeTeamId)!
    assert.equal(byeRow.played, 1)
    assert.equal(byeRow.won, 1)
    assert.equal(byeRow.points, 3)
  })

  test('le tournoi se termine après le nombre de rondes configuré', async ({ client, assert }) => {
    const { club, owner } = await makeOwner()
    // 4 équipes, 1 seule ronde demandée → terminé dès la ronde 1 réglée.
    const t = await makeSwissTournament(club.id, ['A', 'B', 'C', 'D'], 1)
    await client.post(`/tournaments/${t.id}/planning`).loginAs(owner).redirects(0)

    const round1 = await Match.query().where('tournament_id', t.id).where('round_number', 1)
    for (const m of round1) {
      await client
        .patch(`/tournaments/${t.id}/matches/${m.id}`)
        .loginAs(owner)
        .json({ homeScore: 2, awayScore: 1 })
        .redirects(0)
    }

    // Aucune ronde 2 générée (limite atteinte) et tournoi marqué terminé.
    const round2 = await Match.query().where('tournament_id', t.id).where('round_number', 2)
    assert.lengthOf(round2, 0)
    const refreshed = await Tournament.findOrFail(t.id)
    assert.equal(refreshed.status, 'finished')
  })
})
