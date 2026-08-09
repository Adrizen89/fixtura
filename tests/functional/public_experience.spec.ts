import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Écran public enrichi (issue #40) : QR code admin, personnalisation club (logo +
 * couleur), mode TV, et fichiers PWA (manifeste + service worker). Testé de bout en
 * bout via HTTP : scoping club, persistance du branding, rendu SSR public.
 */
test.group('Écran public — QR, branding, mode TV, PWA (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // 1×1 PNG transparent en data-URI (data-URI valide pour le validator branding).
  const PNG_DATA_URI =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  async function makeClub(
    name: string,
    slug: string,
    branding: { primaryColor?: string | null; logo?: string | null } = {}
  ) {
    const club = await Club.create({ name, slug, ...branding })
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
    const tournament = await Tournament.create({
      clubId,
      name: 'Tournoi Public',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'live',
      publicSlug: slug,
      format: 'championship',
      formatConfig: null,
    })
    await Team.createMany(
      ['Alpha', 'Bravo', 'Charlie'].map((name) => ({ tournamentId: tournament.id, name }))
    )
    return tournament
  }

  test('QR code : SVG scopé au club, 404 pour un autre club', async ({ client, assert }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'tournoi-public-a')

    const res = await client.get(`/tournaments/${tournament.id}/qrcode`).loginAs(owner)
    res.assertStatus(200)
    assert.include(res.header('content-type') ?? '', 'image/svg+xml')

    const { owner: intruder } = await makeClub('Club B', 'club-b')
    const denied = await client
      .get(`/tournaments/${tournament.id}/qrcode`)
      .loginAs(intruder)
      .redirects(0)
    denied.assertStatus(404)
  })

  test('branding : owner met à jour logo + couleur, organizer interdit', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')
    const organizer = await User.create({
      clubId: club.id,
      fullName: 'Orga',
      email: 'orga@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    // L'owner accède au formulaire.
    const editRes = await client.get('/club/apparence').loginAs(owner)
    editRes.assertStatus(200)

    // Un organizer n'y a pas accès.
    const forbidden = await client.get('/club/apparence').loginAs(organizer).redirects(0)
    forbidden.assertStatus(403)

    // Mise à jour : couleur + logo persistés.
    await client
      .post('/club/apparence')
      .loginAs(owner)
      .form({ primaryColor: '#3366ff', logo: PNG_DATA_URI })
      .redirects(0)
    await club.refresh()
    assert.equal(club.primaryColor, '#3366ff')
    assert.equal(club.logo, PNG_DATA_URI)

    // Valeurs vides → réglages retirés.
    await client
      .post('/club/apparence')
      .loginAs(owner)
      .form({ primaryColor: '', logo: '' })
      .redirects(0)
    await club.refresh()
    assert.isNull(club.primaryColor)
    assert.isNull(club.logo)
  })

  test('branding : couleur invalide rejetée', async ({ client }) => {
    const { owner } = await makeClub('Club A', 'club-a')
    const res = await client
      .post('/club/apparence')
      .loginAs(owner)
      .header('accept', 'text/html')
      .form({ primaryColor: 'rouge' })
      .redirects(0)
    // VineJS → redirection avec erreurs flashées (302), pas de persistance.
    res.assertStatus(302)
  })

  test('écran public : reflète le logo et la couleur du club', async ({ client, assert }) => {
    const { club } = await makeClub('Club A', 'club-a', {
      primaryColor: '#3366ff',
      logo: PNG_DATA_URI,
    })
    await makeTournament(club.id, 'tournoi-public-a')

    const res = await client.get('/t/tournoi-public-a')
    res.assertStatus(200)
    const html = res.text()
    assert.include(html, '#3366ff') // couleur d'accent appliquée
    assert.include(html, 'data:image/png;base64') // logo inline
  })

  test('mode TV : rend le tableau plein écran en rotation', async ({ client, assert }) => {
    const { club } = await makeClub('Club A', 'club-a')
    await makeTournament(club.id, 'tournoi-public-a')

    const res = await client.get('/t/tournoi-public-a?tv=1')
    res.assertStatus(200)
    assert.include(res.text(), 'tv-board')
  })

  test('iCal : planning public exporté en .ics, 404 pour un slug inconnu', async ({
    client,
    assert,
  }) => {
    const { club } = await makeClub('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'tournoi-public-a')
    const teams = await Team.query().where('tournament_id', tournament.id).orderBy('name')

    await Match.create({
      tournamentId: tournament.id,
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.fromISO('2026-09-01T09:00:00', { zone: 'utc' }),
      homeTeamId: teams[0].id,
      awayTeamId: teams[1].id,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      stage: 'main',
    })

    const res = await client.get('/t/tournoi-public-a/calendrier.ics')
    res.assertStatus(200)
    assert.include(res.header('content-type') ?? '', 'text/calendar')
    const body = res.text()
    assert.include(body, 'BEGIN:VCALENDAR')
    assert.include(body, 'BEGIN:VEVENT')
    assert.include(body, 'SUMMARY:Alpha – Bravo')

    // Téléchargement forcé.
    const dl = await client.get('/t/tournoi-public-a/calendrier.ics?download=1')
    assert.include(dl.header('content-disposition') ?? '', 'attachment')

    // Slug inconnu → 404 (pas de fuite d'existence).
    const notFound = await client.get('/t/inconnu/calendrier.ics').redirects(0)
    notFound.assertStatus(404)
  })

  test('PWA : manifeste et service worker servis', async ({ client, assert }) => {
    const manifest = await client.get('/manifest.webmanifest')
    manifest.assertStatus(200)
    assert.include(manifest.text(), 'Fixtura')

    const sw = await client.get('/sw.js')
    sw.assertStatus(200)
    assert.include(sw.text(), 'fixtura-')

    const icon = await client.get('/icons/icon.svg')
    icon.assertStatus(200)
    assert.include(icon.header('content-type') ?? '', 'svg')
  })
})
