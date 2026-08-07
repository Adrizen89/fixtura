import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { formatLabel, formatEventDate } from '#services/tournament_export'

/**
 * Helpers purs de l'assemblage d'export (cf. issue #38). Le reste du module manipule
 * des modèles Lucid et est couvert par le test fonctionnel `export.spec.ts`.
 */
test.group('tournament_export — helpers', () => {
  test('libellé de format lisible pour chaque format', ({ assert }) => {
    assert.equal(formatLabel('championship'), 'Championnat')
    assert.equal(formatLabel('pools'), 'Poules')
    assert.equal(formatLabel('knockout'), 'Élimination directe')
    assert.equal(formatLabel('hybrid'), 'Poules + élimination')
  })

  test('date de l’événement formatée en français long', ({ assert }) => {
    const date = DateTime.fromISO('2026-09-01')
    assert.equal(formatEventDate(date), 'mardi 1 septembre 2026')
  })
})
