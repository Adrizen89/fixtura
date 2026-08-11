import { test } from '@japa/runner'
import i18nManager from '@adonisjs/i18n/services/main'
import { tournamentValidator } from '#validators/tournament'

/**
 * Messages de validation **internationalisés** (issues #8 + #123).
 *
 * Depuis #123, les messages ne viennent plus d'un provider global figé en français
 * mais des catalogues i18n `resources/lang/{locale}/validator.json`, appliqués via le
 * `messagesProvider` de la locale de la requête (`RequestValidator.messagesProvider`
 * en production). On reconstitue ici ce provider pour chaque langue et on inspecte les
 * messages renvoyés sur des données invalides — en français **et** en anglais.
 */
async function messagesFor(
  locale: string,
  data: Record<string, unknown>
): Promise<Record<string, string>> {
  const messagesProvider = i18nManager.locale(locale).createMessagesProvider()
  try {
    await tournamentValidator.validate(data, { messagesProvider })
    return {}
  } catch (error) {
    const errors = (error as { messages?: { field: string; message: string }[] }).messages ?? []
    return Object.fromEntries(errors.map((e) => [e.field, e.message]))
  }
}

test.group('validation · messages i18n (#8 + #123)', (group) => {
  // Garantit que les catalogues de langue sont chargés (idempotent).
  group.setup(async () => {
    await i18nManager.loadTranslations()
  })

  test('FR — champ requis manquant → message français avec nom de champ traduit', async ({
    assert,
  }) => {
    const messages = await messagesFor('fr', {})
    assert.equal(messages.name, 'Le champ nom est obligatoire.')
    assert.equal(messages.numTerrains, 'Le champ nombre de terrains est obligatoire.')
  })

  test('EN — champ requis manquant → message anglais avec nom de champ traduit', async ({
    assert,
  }) => {
    const messages = await messagesFor('en', {})
    assert.equal(messages.name, 'The name field is required.')
    assert.equal(messages.numTerrains, 'The number of pitches field is required.')
  })

  test('FR — format de date/heure invalide → message ciblé', async ({ assert }) => {
    const messages = await messagesFor('fr', {
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
    assert.equal(messages.startTime, "L'heure de début doit être au format HH:MM.")
  })

  test('EN — format de date/heure invalide → message ciblé', async ({ assert }) => {
    const messages = await messagesFor('en', {
      name: 'Tournoi',
      category: 'U11',
      eventDate: 'pas-une-date',
      startTime: '25:99',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchDurationMin: 0,
      numTerrains: 2,
    })
    assert.equal(messages.eventDate, 'The date must be in YYYY-MM-DD format.')
    assert.equal(messages.startTime, 'The start time must be in HH:MM format.')
  })

  test('FR — borne numérique dépassée → message français', async ({ assert }) => {
    const messages = await messagesFor('fr', {
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
