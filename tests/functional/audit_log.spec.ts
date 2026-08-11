import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import AuditLog from '#models/audit_log'

/**
 * Journal d'audit des actions sensibles (issue #117) — testé de bout en bout via
 * HTTP : enregistrement sur connexion / suppression / changement de rôle, accès
 * réservé au responsable, et cloisonnement par club.
 */
test.group('Journal d’audit (#117)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function makeClub(name: string, slug: string) {
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

  async function makeTournament(clubId: number, name: string) {
    return Tournament.create({
      clubId,
      name,
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 0,
      numTerrains: 2,
      status: 'draft',
      publicSlug: `slug-${clubId}-${name}`,
      format: 'championship',
      formatConfig: null,
    })
  }

  test('enregistre une connexion réussie', async ({ client, assert }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')

    const res = await client
      .post('/login')
      .form({ email: owner.email, password: 'password' })
      .redirects(0)
    res.assertStatus(302)

    const entry = await AuditLog.query().where('action', 'auth.login').first()
    assert.isNotNull(entry)
    assert.equal(entry!.clubId, club.id)
    assert.equal(entry!.userId, owner.id)
    assert.equal(entry!.actorEmail, owner.email)
  })

  test('enregistre la suppression d’un tournoi (auteur, cible)', async ({ client, assert }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')
    const tournament = await makeTournament(club.id, 'Tournoi Pâques')

    await client.delete(`/tournaments/${tournament.id}`).loginAs(owner).redirects(0)

    const entry = await AuditLog.query().where('action', 'tournament.deleted').first()
    assert.isNotNull(entry)
    assert.equal(entry!.clubId, club.id)
    assert.equal(entry!.userId, owner.id)
    assert.equal(entry!.target, 'Tournoi Pâques')
  })

  test('enregistre un changement de rôle avec l’ancien et le nouveau rôle', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')
    const member = await User.create({
      clubId: club.id,
      fullName: 'Orga',
      email: 'orga@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    await client
      .patch(`/membres/${member.id}/role`)
      .loginAs(owner)
      .form({ role: 'owner' })
      .redirects(0)

    const entry = await AuditLog.query().where('action', 'member.role_changed').first()
    assert.isNotNull(entry)
    assert.equal(entry!.target, member.email)
    assert.deepEqual(entry!.metadata, { from: 'organizer', to: 'owner' })
  })

  test('le journal est réservé au responsable (owner)', async ({ client }) => {
    const { club, owner } = await makeClub('Club A', 'club-a')
    const organizer = await User.create({
      clubId: club.id,
      fullName: 'Orga',
      email: 'orga@test.fixtura',
      password: 'password',
      role: 'organizer',
    })

    const ownerRes = await client.get('/journal').loginAs(owner)
    ownerRes.assertStatus(200)

    const organizerRes = await client.get('/journal').loginAs(organizer).redirects(0)
    organizerRes.assertStatus(302) // refusé → redirection (deny)
  })

  test('le journal est cloisonné par club', async ({ client, assert }) => {
    const { club: clubA, owner: ownerA } = await makeClub('Club A', 'club-a')
    const { club: clubB, owner: ownerB } = await makeClub('Club B', 'club-b')

    const tA = await makeTournament(clubA.id, 'Coupe Alpha')
    const tB = await makeTournament(clubB.id, 'Coupe Bravo')
    await client.delete(`/tournaments/${tA.id}`).loginAs(ownerA).redirects(0)
    await client.delete(`/tournaments/${tB.id}`).loginAs(ownerB).redirects(0)

    // Écriture cloisonnée : chaque club ne voit que ses propres entrées.
    const aEntries = await AuditLog.query().where('club_id', clubA.id)
    assert.lengthOf(aEntries, 1)
    assert.equal(aEntries[0].target, 'Coupe Alpha')

    // Lecture cloisonnée : le journal de l'owner A montre « Alpha », jamais « Bravo ».
    const page = await client.get('/journal').loginAs(ownerA)
    page.assertStatus(200)
    assert.include(page.text(), 'Coupe Alpha')
    assert.notInclude(page.text(), 'Coupe Bravo')
  })
})
