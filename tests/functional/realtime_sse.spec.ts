import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import transmit from '@adonisjs/transmit/services/main'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Intégration temps réel (issue #30) : une **saisie de score** doit mettre à jour
 * l'écran public. On couvre les deux chemins de bout en bout, via HTTP :
 *
 *  1. Diffusion SSE (push) : la saisie déclenche un `transmit.broadcast` sur le
 *     canal du tournoi (`tournaments/{public_slug}`) — le même canal auquel
 *     s'abonne l'écran public. On capte l'événement via le hook `transmit.on`
 *     plutôt que d'ouvrir un flux SSE (robuste, sans dépendance navigateur).
 *  2. Rendu public (chargement initial) : l'écran public SSR reflète le résultat.
 *
 * Isolé par transaction (truncate) ; le tournoi et son match sont montés via les
 * modèles, la saisie passe par le **vrai** endpoint HTTP.
 */
test.group('Temps réel · saisie de score → écran public (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function seed() {
    const club = await Club.create({ name: 'Club RT', slug: 'club-rt' })
    const user = await User.create({
      clubId: club.id,
      fullName: 'Orga RT',
      email: 'orga-rt@test.fixtura',
      password: 'password',
      role: 'owner',
    })
    const tournament = await Tournament.create({
      clubId: club.id,
      name: 'Tournoi RT',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status: 'scheduled',
      publicSlug: 'rt-slug',
      format: 'championship',
      formatConfig: null,
    })
    const alpha = await Team.create({ tournamentId: tournament.id, name: 'Alpha' })
    const bravo = await Team.create({ tournamentId: tournament.id, name: 'Bravo' })
    const match = await Match.create({
      tournamentId: tournament.id,
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.fromISO('2026-09-01T09:00:00'),
      homeTeamId: alpha.id,
      awayTeamId: bravo.id,
      status: 'scheduled',
      stage: 'main',
    })
    return { user, tournament, match }
  }

  test('une saisie de score diffuse results:updated sur le canal du tournoi', async ({
    client,
    assert,
  }) => {
    const { user, tournament, match } = await seed()

    // Capture des diffusions SSE émises pendant la requête (hook lifecycle transmit).
    const broadcasts: Array<{ channel: string; payload: unknown }> = []
    const off = transmit.on('broadcast', (event) => broadcasts.push(event))

    try {
      await client
        .patch(`/tournaments/${tournament.id}/matches/${match.id}`)
        .loginAs(user)
        .form({ homeScore: 2, awayScore: 0 })
        .redirects(0)
    } finally {
      off()
    }

    const update = broadcasts.find((b) => b.channel === `tournaments/${tournament.publicSlug}`)
    assert.exists(update, 'un broadcast doit être émis sur le canal du tournoi')

    const payload = update!.payload as {
      type: string
      standings: Array<{ teamName: string; points: number }>
    }
    assert.equal(payload.type, 'results:updated')

    // Le classement diffusé reflète immédiatement le score (Alpha 2–0 → 3 pts, en tête).
    assert.equal(payload.standings[0].teamName, 'Alpha')
    assert.equal(payload.standings[0].points, 3)
  })

  test('l’écran public (SSR) reflète un score enregistré', async ({ client, assert }) => {
    const { user, tournament, match } = await seed()

    await client
      .patch(`/tournaments/${tournament.id}/matches/${match.id}`)
      .loginAs(user)
      .form({ homeScore: 2, awayScore: 0 })
      .redirects(0)

    const res = await client.get(`/t/${tournament.publicSlug}`)
    res.assertStatus(200)
    // Les équipes et le classement sont rendus côté serveur (chargement initial).
    assert.include(res.text(), 'Alpha')
    assert.include(res.text(), 'Bravo')
  })

  test('un forfait diffuse aussi sur le canal du tournoi', async ({ client, assert }) => {
    const { user, tournament, match } = await seed()

    const broadcasts: Array<{ channel: string; payload: unknown }> = []
    const off = transmit.on('broadcast', (event) => broadcasts.push(event))

    try {
      await client
        .patch(`/tournaments/${tournament.id}/matches/${match.id}/forfeit`)
        .loginAs(user)
        .form({ side: 'home' })
        .redirects(0)
    } finally {
      off()
    }

    const update = broadcasts.find((b) => b.channel === `tournaments/${tournament.publicSlug}`)
    assert.exists(update, 'un forfait doit aussi diffuser sur le canal du tournoi')
    assert.equal((update!.payload as { type: string }).type, 'results:updated')
  })
})
