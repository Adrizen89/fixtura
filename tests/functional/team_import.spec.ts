import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'

/**
 * Import d'équipes CSV/Excel (issue #120) — parcours HTTP : aperçu JSON du fichier
 * téléversé, confirmation d'insertion (dédup vis-à-vis de l'existant), rejet d'un
 * format non supporté, et cloisonnement par club.
 */
test.group("Import d'équipes CSV/Excel (fonctionnel)", (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function makeOwner(slug: string) {
    const club = await Club.create({ name: `Club ${slug}`, slug })
    const owner = await User.create({
      clubId: club.id,
      fullName: 'Orga',
      email: `orga-${slug}@test.fixtura`,
      password: 'password',
      role: 'owner',
    })
    return { club, owner }
  }

  async function makeTournament(clubId: number) {
    return Tournament.create({
      clubId,
      name: 'Tournoi Import',
      category: 'U11',
      eventDate: DateTime.fromISO('2026-09-01'),
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: null,
      lunchDurationMin: 30,
      numTerrains: 2,
      status: 'draft',
      publicSlug: `slug-${clubId}`,
      format: 'championship',
      formatConfig: null,
    })
  }

  test('aperçu CSV : en-tête ignorée, doublons signalés', async ({ client, assert }) => {
    const { club, owner } = await makeOwner('import-a')
    const tournament = await makeTournament(club.id)

    const csv = 'Nom\nAlpha\nBravo\nalpha\n'
    const res = await client
      .post(`/tournaments/${tournament.id}/teams/import/preview`)
      .loginAs(owner)
      .file('file', Buffer.from(csv), { filename: 'teams.csv', contentType: 'text/csv' })

    res.assertStatus(200)
    const body = res.body()
    assert.deepEqual(body.importable, ['Alpha', 'Bravo'])
    assert.equal(body.counts.ok, 2)
    assert.equal(body.counts.skipped, 1) // « alpha » = doublon de casse
  })

  test('confirmation : insère les noms retenus, déduplique vis-à-vis de l’existant', async ({
    client,
    assert,
  }) => {
    const { club, owner } = await makeOwner('import-b')
    const tournament = await makeTournament(club.id)
    await Team.create({ tournamentId: tournament.id, name: 'Bravo' }) // déjà présente

    const res = await client
      .post(`/tournaments/${tournament.id}/teams/import`)
      .loginAs(owner)
      .json({ names: ['Alpha', 'Bravo', 'Charlie'] })
      .redirects(0)

    res.assertStatus(302)
    const teams = await Team.query().where('tournament_id', tournament.id).orderBy('name')
    // Bravo n'est pas dupliquée ; Alpha et Charlie ajoutées.
    assert.deepEqual(
      teams.map((t) => t.name),
      ['Alpha', 'Bravo', 'Charlie']
    )
  })

  test('aperçu XLSX : première feuille lue, en-tête détectée', async ({ client, assert }) => {
    const { club, owner } = await makeOwner('import-c')
    const tournament = await makeTournament(club.id)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Équipes')
    sheet.addRow(['Équipe'])
    sheet.addRow(['Xanadu'])
    sheet.addRow(['York'])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    const res = await client
      .post(`/tournaments/${tournament.id}/teams/import/preview`)
      .loginAs(owner)
      .file('file', buffer, {
        filename: 'teams.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    res.assertStatus(200)
    assert.deepEqual(res.body().importable, ['Xanadu', 'York'])
  })

  test('format non supporté rejeté (422)', async ({ client }) => {
    const { club, owner } = await makeOwner('import-d')
    const tournament = await makeTournament(club.id)

    const res = await client
      .post(`/tournaments/${tournament.id}/teams/import/preview`)
      .loginAs(owner)
      .file('file', Buffer.from('Alpha'), { filename: 'teams.txt', contentType: 'text/plain' })

    res.assertStatus(422)
  })

  test('cloisonnement : un autre club ne peut pas importer (404)', async ({ client }) => {
    const { club } = await makeOwner('import-e')
    const tournament = await makeTournament(club.id)
    const { owner: intruder } = await makeOwner('import-f')

    const res = await client
      .post(`/tournaments/${tournament.id}/teams/import/preview`)
      .loginAs(intruder)
      .file('file', Buffer.from('Alpha'), { filename: 'teams.csv', contentType: 'text/csv' })
      .redirects(0)

    res.assertStatus(404)
  })
})
