import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import type { TournamentStatus } from '#models/tournament'
import Event from '#models/event'
import type { EventStatus } from '#models/event'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Historique (issue #108) — archivage & consultation des éditions terminées.
 *
 * Vérifie via HTTP : (1) la distinction actifs / archivés (les `finished` sont dans
 * l'Historique, pas dans les tableaux de bord ; l'inverse pour les actifs) ;
 * (2) le cloisonnement par club (scope global automatique, issue #34) ;
 * (3) la consultation en **lecture seule** (l'archive ne propose aucune action de
 * gestion et renvoie vers l'écran public figé). Isolé par transaction.
 */
test.group('Historique (fonctionnel)', (group) => {
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

  async function makeTournament(
    clubId: number,
    name: string,
    status: TournamentStatus,
    opts: { eventId?: number; category?: string } = {}
  ) {
    return Tournament.create({
      clubId,
      eventId: opts.eventId ?? null,
      name,
      category: opts.category ?? 'U11',
      eventDate: DateTime.fromISO('2026-06-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 1,
      status,
      publicSlug: `slug-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      format: 'championship',
      formatConfig: null,
    })
  }

  async function makeEvent(clubId: number, name: string, status: EventStatus) {
    return Event.create({
      clubId,
      name,
      eventDate: DateTime.fromISO('2026-06-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status,
      publicSlug: `slug-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    })
  }

  test('sépare éditions actives et archivées entre tableaux de bord et historique', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await seedClub('split')
    await makeTournament(club.id, 'Tournoi Archive', 'finished')
    await makeTournament(club.id, 'Tournoi Actif', 'draft')
    await makeEvent(club.id, 'Evenement Archive', 'finished')
    await makeEvent(club.id, 'Evenement Actif', 'draft')

    // L'historique ne montre QUE les éditions terminées.
    const history = await client.get('/historique').loginAs(owner)
    history.assertStatus(200)
    assert.include(history.text(), 'Tournoi Archive')
    assert.include(history.text(), 'Evenement Archive')
    assert.notInclude(history.text(), 'Tournoi Actif')
    assert.notInclude(history.text(), 'Evenement Actif')

    // Les tableaux de bord ne montrent QUE les éditions actives.
    const tournaments = await client.get('/tournaments').loginAs(owner)
    assert.include(tournaments.text(), 'Tournoi Actif')
    assert.notInclude(tournaments.text(), 'Tournoi Archive')

    const events = await client.get('/events').loginAs(owner)
    assert.include(events.text(), 'Evenement Actif')
    assert.notInclude(events.text(), 'Evenement Archive')
  })

  test('une catégorie terminée est consultée via son événement, pas listée en tournoi autonome', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await seedClub('cat')
    const event = await makeEvent(club.id, 'Evenement Parent', 'finished')
    await makeTournament(club.id, 'Categorie Interne', 'finished', {
      eventId: event.id,
      category: 'U13',
    })

    const history = await client.get('/historique').loginAs(owner)
    history.assertStatus(200)
    assert.include(history.text(), 'Evenement Parent')
    // La catégorie (event_id renseigné) n'apparaît pas comme tournoi autonome.
    assert.notInclude(history.text(), 'Categorie Interne')
  })

  test('cloisonnement par club : un club ne voit que son propre historique', async ({
    client,
    assert,
  }) => {
    const a = await seedClub('a')
    const b = await seedClub('b')
    await makeTournament(a.club.id, 'Archive A', 'finished')
    await makeEvent(a.club.id, 'Evenement A', 'finished')
    await makeTournament(b.club.id, 'Archive B', 'finished')

    const res = await client.get('/historique').loginAs(a.owner)
    res.assertStatus(200)
    assert.include(res.text(), 'Archive A')
    assert.include(res.text(), 'Evenement A')
    assert.notInclude(res.text(), 'Archive B')
  })

  test('consultation en lecture seule : lien vers l’écran public figé, aucune action de gestion', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await seedClub('ro')
    const tournament = await makeTournament(club.id, 'Archive Consultable', 'finished')
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

    // L'historique renvoie vers l'écran public et n'expose aucune action de gestion.
    const history = await client.get('/historique').loginAs(owner)
    history.assertStatus(200)
    assert.include(history.text(), `/t/${tournament.publicSlug}`)
    assert.notInclude(history.text(), `/tournaments/${tournament.id}/edit`)

    // L'écran public (sans auth) montre la consultation figée — classement final inclus.
    const publicRes = await client.get(`/t/${tournament.publicSlug}`)
    publicRes.assertStatus(200)
    assert.include(publicRes.text(), 'Alpha')
    assert.include(publicRes.text(), 'Bravo')
  })
})
