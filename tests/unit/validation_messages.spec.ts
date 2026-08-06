import { test } from '@japa/runner'
import vine from '@vinejs/vine'
import { tournamentValidator } from '#validators/tournament'

/**
 * Vérifie que les messages de validation sont bien en français (cf. issue #8).
 * Le provider global est installé par le preload `start/validator.ts`, chargé au
 * boot de l'app (y compris en test). On valide des données invalides et on
 * inspecte les messages renvoyés.
 */
async function messagesFor(data: Record<string, unknown>): Promise<Record<string, string>> {
  try {
    await tournamentValidator.validate(data)
    return {}
  } catch (error) {
    const errors = (error as { messages?: { field: string; message: string }[] }).messages ?? []
    return Object.fromEntries(errors.map((e) => [e.field, e.message]))
  }
}

test.group('validation · messages français', () => {
  test('le provider de messages global est bien un provider VineJS', ({ assert }) => {
    assert.exists(vine.messagesProvider)
  })

  test('champ requis manquant → message français avec nom de champ traduit', async ({ assert }) => {
    const messages = await messagesFor({})
    assert.equal(messages.name, 'Le champ nom est obligatoire.')
    assert.equal(messages.numTerrains, 'Le champ nombre de terrains est obligatoire.')
  })

  test('format de date/heure invalide → message ciblé', async ({ assert }) => {
    const messages = await messagesFor({
      name: 'Tournoi',
      category: 'U11',
      eventDate: 'pas-une-date',
      startTime: '25:99',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchDurationMin: 0,
      numTerrains: 2,
    })
    assert.equal(messages.eventDate, 'La date doit être au format AAAA-MM-JJ.')
    assert.equal(messages.startTime, 'L’heure de début doit être au format HH:MM.')
  })

  test('borne numérique dépassée → message français', async ({ assert }) => {
    const messages = await messagesFor({
      name: 'Tournoi',
      category: 'U11',
      eventDate: '2026-05-01',
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchDurationMin: 0,
      numTerrains: 99, // max 20
    })
    assert.equal(messages.numTerrains, 'Le champ nombre de terrains ne doit pas dépasser 20.')
  })
})
