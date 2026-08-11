import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import TeamRegistration from '#models/team_registration'

/**
 * Validation / refus des demandes d'inscription côté organisateur (issue #113) —
 * testé de bout en bout via HTTP : valider crée l'équipe, refuser archive la demande,
 * cloisonnement par club, garde anti-doublon et idempotence des décisions.
 */
test.group('Décision sur une demande d’inscription (#113)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function makeClubOwner(name: string, slug: string) {
    const club = await Club.create({ name, slug })
    const owner = await User.create({
      clubId: club.id,
      fullName: `Owner ${name}`,
      email: `owner-${slug}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    return { club, owner }
  }

  async function makeTournament(clubId: number, slug: string) {
    return Tournament.create({
      clubId,
      name: 'Tournoi Inscriptions',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'draft',
      publicSlug: `public-${slug}`,
      format: 'championship',
      formatConfig: null,
      registrationOpen: true,
      registrationToken: `tok-${slug}`,
      registrationCapacity: null,
    })
  }

  function makePending(tournamentId: number, teamName: string, email = 'contact@example.com') {
    return TeamRegistration.create({
      tournamentId,
      teamName,
      contactEmail: email,
      status: 'pending',
    })
  }

  test('valider une demande → équipe créée + demande approuvée', async ({ client, assert }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    const reg = await makePending(tournament.id, 'Les Lions', 'lions@example.com')

    const res = await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/approve`)
      .loginAs(owner)
      .redirects(0)
    res.assertStatus(302)

    // L'équipe est créée dans le tournoi, avec le contact de la demande.
    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 1)
    assert.equal(teams[0].name, 'Les Lions')
    assert.equal(teams[0].contactEmail, 'lions@example.com')

    // La demande est marquée validée et reliée à l'équipe.
    await reg.refresh()
    assert.equal(reg.status, 'approved')
    assert.equal(reg.teamId, teams[0].id)
    assert.equal(reg.decidedByUserId, owner.id)
    assert.isNotNull(reg.decidedAt)
  })

  test('refuser une demande → archivée, aucune équipe', async ({ client, assert }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    const reg = await makePending(tournament.id, 'Les Aigles')

    const res = await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/reject`)
      .loginAs(owner)
      .redirects(0)
    res.assertStatus(302)

    await reg.refresh()
    assert.equal(reg.status, 'rejected')
    assert.equal(reg.decidedByUserId, owner.id)
    assert.isNotNull(reg.decidedAt)

    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 0)
  })

  test('valider un nom déjà pris → refusé, la demande reste en attente', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    // Une équipe homonyme a été ajoutée entre-temps (ajout manuel / autre validation).
    await Team.create({ tournamentId: tournament.id, name: 'Les Lions' })
    const reg = await makePending(tournament.id, 'les lions')

    const res = await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/approve`)
      .loginAs(owner)
      .redirects(0)
    res.assertStatus(302)

    // Pas de doublon créé ; la demande reste en attente pour un traitement manuel.
    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 1)
    await reg.refresh()
    assert.equal(reg.status, 'pending')
  })

  test('demande déjà traitée → seconde décision sans effet', async ({ client, assert }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    const reg = await makePending(tournament.id, 'Les Panthères')

    await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/approve`)
      .loginAs(owner)
      .redirects(0)

    // Rejouer une décision sur une demande déjà validée ne crée pas de seconde équipe.
    const again = await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/reject`)
      .loginAs(owner)
      .redirects(0)
    again.assertStatus(302)

    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 1)
    await reg.refresh()
    assert.equal(reg.status, 'approved') // inchangé
  })

  test('décision cloisonnée par club (404 hors club)', async ({ client }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    const reg = await makePending(tournament.id, 'Les Lions')
    const { owner: intruder } = await makeClubOwner('Club B', 'club-b')

    const res = await client
      .post(`/tournaments/${tournament.id}/registrations/${reg.id}/approve`)
      .loginAs(intruder)
      .redirects(0)
    res.assertStatus(404)
  })

  test('la page du tournoi liste les demandes en attente', async ({ client, assert }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'a')
    await makePending(tournament.id, 'Équipe Alpha')

    const page = await client.get(`/tournaments/${tournament.id}`).loginAs(owner)
    page.assertStatus(200)
    assert.include(page.text(), 'Équipe Alpha')
    assert.include(page.text(), 'Valider')
  })
})
