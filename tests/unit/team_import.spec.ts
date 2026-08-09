import { test } from '@japa/runner'
import ExcelJS from 'exceljs'
import { parseCsv, buildImportPreview, extractXlsxRows } from '#services/team_import'

/**
 * Import d'équipes CSV/Excel (issue #120) — parsing pur (aucune dépendance HTTP/DB),
 * plus un aller-retour XLSX via ExcelJS.
 */

test.group('team_import · parseCsv', () => {
  test('lignes simples séparées par virgule', ({ assert }) => {
    assert.deepEqual(parseCsv('Alpha\nBravo\nCharlie'), [['Alpha'], ['Bravo'], ['Charlie']])
  })

  test('séparateur point-virgule (export Excel FR)', ({ assert }) => {
    assert.deepEqual(parseCsv('Nom;Ville\nAlpha;Paris\nBravo;Lyon'), [
      ['Nom', 'Ville'],
      ['Alpha', 'Paris'],
      ['Bravo', 'Lyon'],
    ])
  })

  test('champs entre guillemets avec virgule et guillemet échappé', ({ assert }) => {
    assert.deepEqual(parseCsv('"Alpha, le club","Say ""hi"""'), [['Alpha, le club', 'Say "hi"']])
  })

  test('BOM et fins de ligne CRLF gérés', ({ assert }) => {
    assert.deepEqual(parseCsv('﻿Alpha\r\nBravo\r\n'), [['Alpha'], ['Bravo'], ['']])
  })

  test('CR isolé (ancien Mac) comme fin de ligne', ({ assert }) => {
    assert.deepEqual(parseCsv('Alpha\rBravo'), [['Alpha'], ['Bravo']])
  })
})

test.group('team_import · buildImportPreview', () => {
  test('noms valides → tous « ok », importable dans l’ordre', ({ assert }) => {
    const preview = buildImportPreview([['Alpha'], ['Bravo'], ['Charlie']], [])
    assert.deepEqual(
      preview.rows.map((r) => r.status),
      ['ok', 'ok', 'ok']
    )
    assert.deepEqual(preview.importable, ['Alpha', 'Bravo', 'Charlie'])
    assert.deepEqual(preview.counts, { total: 3, ok: 3, skipped: 0 })
  })

  test('en-tête reconnue ignorée, colonne « nom » choisie', ({ assert }) => {
    const preview = buildImportPreview(
      [
        ['#', 'Équipe'],
        ['1', 'Alpha'],
        ['2', 'Bravo'],
      ],
      []
    )
    assert.deepEqual(preview.importable, ['Alpha', 'Bravo'])
    // Les lignes de données conservent leur numéro de fichier (2 et 3).
    assert.deepEqual(
      preview.rows.map((r) => r.line),
      [2, 3]
    )
  })

  test('nom vide mais ligne non vide → « empty » ; nom > 60 → « too_long »', ({ assert }) => {
    const long = 'x'.repeat(61)
    // 2e colonne renseignée → la ligne n'est pas « vide » : le nom manquant est signalé.
    const preview = buildImportPreview(
      [
        ['Alpha', 'a@x'],
        ['', 'b@x'],
        [long, 'c@x'],
      ],
      []
    )
    assert.deepEqual(
      preview.rows.map((r) => r.status),
      ['ok', 'empty', 'too_long']
    )
    assert.deepEqual(preview.importable, ['Alpha'])
  })

  test('doublon dans le fichier (insensible à la casse) → « duplicate_file »', ({ assert }) => {
    const preview = buildImportPreview([['Alpha'], ['alpha'], ['Bravo']], [])
    assert.deepEqual(
      preview.rows.map((r) => r.status),
      ['ok', 'duplicate_file', 'ok']
    )
    assert.deepEqual(preview.importable, ['Alpha', 'Bravo'])
  })

  test('doublon d’une équipe déjà présente → « duplicate_existing »', ({ assert }) => {
    const preview = buildImportPreview([['Alpha'], ['Bravo']], ['ALPHA'])
    assert.deepEqual(
      preview.rows.map((r) => r.status),
      ['duplicate_existing', 'ok']
    )
    assert.deepEqual(preview.importable, ['Bravo'])
  })

  test('lignes entièrement vides ignorées (bruit / saut final)', ({ assert }) => {
    const preview = buildImportPreview([['Alpha'], ['', ''], ['Bravo'], ['']], [])
    assert.equal(preview.counts.total, 2)
    assert.deepEqual(preview.importable, ['Alpha', 'Bravo'])
  })

  test('au-delà de 500 lignes → tronqué', ({ assert }) => {
    const rows = Array.from({ length: 520 }, (_, i) => [`Team ${i}`])
    const preview = buildImportPreview(rows, [])
    assert.isTrue(preview.truncated)
    assert.equal(preview.counts.total, 500)
  })
})

test.group('team_import · extractXlsxRows', () => {
  test('aller-retour : un classeur XLSX est ramené à une matrice de cellules', async ({
    assert,
  }) => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Équipes')
    sheet.addRow(['Nom'])
    sheet.addRow(['Alpha'])
    sheet.addRow(['Bravo'])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    const rows = await extractXlsxRows(buffer)
    // La 1re feuille est relue ligne par ligne.
    assert.deepEqual(rows[0], ['Nom'])
    assert.deepEqual(rows[1], ['Alpha'])
    assert.deepEqual(rows[2], ['Bravo'])

    // Et l'aperçu détecte l'en-tête et retient les deux équipes.
    const preview = buildImportPreview(rows, [])
    assert.deepEqual(preview.importable, ['Alpha', 'Bravo'])
  })

  test('cellules numériques converties en texte', async ({ assert }) => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('S')
    sheet.addRow([2026])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    const rows = await extractXlsxRows(buffer)
    assert.deepEqual(rows[0], ['2026'])
  })
})
