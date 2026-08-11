import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import TeamRegistration from '#models/team_registration'
import { resetRateLimits } from '#services/rate_limit'

/**
 * Inscription publique d'une équipe à un tournoi (issue #112) — testé de bout en
 * bout via HTTP : ouverture/fermeture par l'orga, lien public, capacité et
 * fermeture auto, honeypot anti-spam, cloisonnement par club. Depuis #113, une
 * soumission dépose une **demande** (`TeamRegistration`), pas directement une équipe.
 */
test.group('Inscription publique d’une équipe (#112)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => resetRateLimits())

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

  async function makeTournament(
    clubId: number,
    opts: {
      slug: string
      open?: boolean
      token?: string | null
      capacity?: number | null
    }
  ) {
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
      publicSlug: `public-${opts.slug}`,
      format: 'championship',
      formatConfig: null,
      registrationOpen: opts.open ?? false,
      registrationToken: opts.token ?? null,
      registrationCapacity: opts.capacity ?? null,
    })
  }

  test('l’orga ouvre les inscriptions → jeton généré + formulaire public actif', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a' })

    const res = await client
      .patch(`/tournaments/${tournament.id}/registration`)
      .loginAs(owner)
      .json({ open: true, capacity: 8 })
      .redirects(0)
    res.assertStatus(302)

    await tournament.refresh()
    assert.isTrue(tournament.registrationOpen)
    assert.isNotNull(tournament.registrationToken)
    assert.equal(tournament.registrationCapacity, 8)

    // Le lien public affiche le formulaire d'inscription.
    const page = await client.get(`/inscription/${tournament.registrationToken}`)
    page.assertStatus(200)
    assert.include(page.text(), 'Inscrire mon')
  })

  test('formulaire « fermé » tant que l’orga n’a pas ouvert', async ({ client, assert }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    await makeTournament(club.id, { slug: 'a', open: false, token: 'tok-closed' })

    const res = await client.get('/inscription/tok-closed')
    res.assertStatus(200)
    assert.include(res.text(), 'ne sont pas ouvertes')
  })

  test('une équipe s’inscrit → demande en attente (pas encore d’équipe)', async ({
    client,
    assert,
  }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a', open: true, token: 'tok-open' })

    const res = await client
      .post('/inscription/tok-open')
      .form({ name: 'Les Lions', contactEmail: 'Lions@Example.com', website: '' })
      .redirects(0)
    res.assertStatus(302)

    // Une demande en attente est créée ; aucune équipe tant qu'elle n'est pas validée.
    const requests = await TeamRegistration.query().where('tournament_id', tournament.id)
    assert.lengthOf(requests, 1)
    assert.equal(requests[0].teamName, 'Les Lions')
    assert.equal(requests[0].contactEmail, 'lions@example.com') // normalisé en minuscules
    assert.equal(requests[0].status, 'pending')

    const teams = await Team.query().where('tournament_id', tournament.id)
    assert.lengthOf(teams, 0)
  })

  test('nom déjà pris → refusé, aucune demande en double', async ({ client, assert }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a', open: true, token: 'tok-dup' })
    await Team.create({ tournamentId: tournament.id, name: 'Les Lions' })

    const res = await client
      .post('/inscription/tok-dup')
      .header('accept', 'text/html')
      .form({ name: 'les lions', contactEmail: 'x@example.com', website: '' })
      .redirects(0)
    res.assertStatus(302) // VineJS → redirection avec erreurs, pas de création

    const requests = await TeamRegistration.query().where('tournament_id', tournament.id)
    assert.lengthOf(requests, 0)
  })

  test('deux demandes homonymes → la 2ᵉ est refusée', async ({ client, assert }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a', open: true, token: 'tok-dup2' })

    await client
      .post('/inscription/tok-dup2')
      .form({ name: 'Les Aigles', contactEmail: 'a@example.com', website: '' })
      .redirects(0)
    const second = await client
      .post('/inscription/tok-dup2')
      .header('accept', 'text/html')
      .form({ name: 'les aigles', contactEmail: 'b@example.com', website: '' })
      .redirects(0)
    second.assertStatus(302)

    const requests = await TeamRegistration.query().where('tournament_id', tournament.id)
    assert.lengthOf(requests, 1) // la seconde, homonyme, n'a pas été enregistrée
  })

  test('capacité atteinte → complet, inscription refusée', async ({ client, assert }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, {
      slug: 'a',
      open: true,
      token: 'tok-full',
      capacity: 1,
    })
    // Une demande en attente occupe déjà l'unique place (occupation = équipes + demandes).
    await TeamRegistration.create({
      tournamentId: tournament.id,
      teamName: 'Déjà demandée',
      contactEmail: 'first@example.com',
      status: 'pending',
    })

    // La page annonce « complet ».
    const page = await client.get('/inscription/tok-full')
    page.assertStatus(200)
    assert.include(page.text(), 'complet')

    // Toute nouvelle inscription est rejetée : le compte reste à 1.
    const res = await client
      .post('/inscription/tok-full')
      .form({ name: 'En trop', contactEmail: 'trop@example.com', website: '' })
      .redirects(0)
    res.assertStatus(302)

    const requests = await TeamRegistration.query().where('tournament_id', tournament.id)
    assert.lengthOf(requests, 1)
  })

  test('honeypot rempli → aucune demande créée (silencieux)', async ({ client, assert }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a', open: true, token: 'tok-bot' })

    const res = await client
      .post('/inscription/tok-bot')
      .form({ name: 'Robot FC', contactEmail: 'bot@example.com', website: 'http://spam.example' })
      .redirects(0)
    res.assertStatus(302)

    const requests = await TeamRegistration.query().where('tournament_id', tournament.id)
    assert.lengthOf(requests, 0)
  })

  test('jeton invalide → page indisponible', async ({ client, assert }) => {
    const res = await client.get('/inscription/inexistant')
    res.assertStatus(200)
    assert.include(res.text(), 'indisponible')
  })

  test('réglage des inscriptions cloisonné par club (404 hors club)', async ({ client }) => {
    const { club } = await makeClubOwner('Club A', 'club-a')
    const tournament = await makeTournament(club.id, { slug: 'a' })
    const { owner: intruder } = await makeClubOwner('Club B', 'club-b')

    const res = await client
      .patch(`/tournaments/${tournament.id}/registration`)
      .loginAs(intruder)
      .json({ open: true, capacity: 8 })
      .redirects(0)
    res.assertStatus(404)
  })
})
