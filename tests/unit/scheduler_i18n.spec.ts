import { test } from '@japa/runner'
import i18nManager from '@adonisjs/i18n/services/main'
import { SchedulerError, buildKnockout, buildDoubleElimination } from '#services/scheduler/index'
import type { SlotSource } from '#services/scheduler/index'
import { translateSchedulerError } from '#services/scheduler_i18n'

/** Traduit la SchedulerError effectivement levée par `fn` (échoue si rien n'est levé). */
function translateThrown(locale: 'en' | 'fr', fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    if (error instanceof SchedulerError) {
      return translateSchedulerError(i18nManager.locale(locale), error)
    }
    throw error
  }
  throw new Error('Aucune SchedulerError levée')
}

/**
 * Localisation des messages du scheduler (issue #123). On vérifie, sans toucher au
 * module pur, que chaque message (statique ou paramétré) est traduit en anglais, que
 * le français reste le message d'origine (repli), et qu'un message inconnu retombe
 * proprement sur lui-même.
 */
test.group('scheduler_i18n · traduction des erreurs de planning (#123)', (group) => {
  group.setup(async () => {
    await i18nManager.loadTranslations()
  })

  const en = () => i18nManager.locale('en')
  const fr = () => i18nManager.locale('fr')
  const tr = (locale: 'en' | 'fr', message: string) =>
    translateSchedulerError(locale === 'en' ? en() : fr(), new SchedulerError(message))

  // Messages statiques : (français d'origine, anglais attendu).
  const STATIC: Array<[string, string]> = [
    ['Des équipes sont présentes en double.', 'Some teams are duplicated.'],
    [
      'Il faut au moins 2 équipes pour générer un planning.',
      'At least 2 teams are required to generate a schedule.',
    ],
    ['Il faut au moins 1 terrain.', 'At least 1 pitch is required.'],
    [
      "La durée d'un match doit être d'au moins 1 minute.",
      'Match duration must be at least 1 minute.',
    ],
    [
      'La pause entre matchs ne peut pas être négative.',
      'The break between matches cannot be negative.',
    ],
    [
      'La durée de la pause déjeuner ne peut pas être négative.',
      'The lunch break duration cannot be negative.',
    ],
    ['Aucun match à planifier.', 'No match to schedule.'],
    [
      "Il faut au moins 2 qualifiés pour construire un arbre d'élimination directe.",
      'At least 2 qualified teams are required to build a single-elimination bracket.',
    ],
    [
      'Une même équipe apparaît deux fois parmi les qualifiés.',
      'A team appears twice among the qualified teams.',
    ],
    [
      'Il faut au moins 2 qualifiés pour une double élimination.',
      'At least 2 qualified teams are required for a double elimination.',
    ],
    [
      'Il faut au moins 2 équipes pour former des poules.',
      'At least 2 teams are required to form groups.',
    ],
    ['Il faut au moins 1 poule.', 'At least 1 group is required.'],
    [
      'Le système suisse se génère ronde par ronde.',
      'The Swiss system is generated round by round.',
    ],
    [
      'Le nombre de poules (format_config.numPools) est requis (≥ 1).',
      'The number of groups (format_config.numPools) is required (≥ 1).',
    ],
    [
      'Le nombre de qualifiés par poule doit être ≥ 1.',
      'The number of qualifiers per group must be ≥ 1.',
    ],
    [
      'Le nombre de repêchés doit être un entier ≥ 0.',
      'The number of best runners-up must be an integer ≥ 0.',
    ],
    [
      'Il faut au moins 2 qualifiés pour une phase finale.',
      'At least 2 qualified teams are required for a knockout phase.',
    ],
    [
      'Impossible de générer un planning respectant les contraintes avec ces paramètres. Augmentez le nombre de terrains ou réduisez les pauses.',
      'Cannot generate a schedule that meets the constraints with these settings. Increase the number of pitches or reduce the breaks.',
    ],
    [
      'Incohérence interne du bracket : deux byes appariés (entrées invalides).',
      'Internal bracket inconsistency: two byes paired (invalid entries).',
    ],
    [
      'Petite finale impossible avec ces qualifiés : il faut deux demi-finales réellement disputées (au moins 4 qualifiés, sans bye en demi-finale).',
      'Third-place match impossible with these qualified teams: two genuinely played semi-finals are required (at least 4 qualified teams, no bye in the semi-finals).',
    ],
  ]

  // Messages paramétrés : (français d'origine, anglais attendu avec valeurs interpolées).
  const PARAM: Array<[string, string]> = [
    [
      'Heure invalide : « 25:99 » (format attendu HH:mm).',
      'Invalid time: “25:99” (expected format HH:mm).',
    ],
    ['Unité de planning en double : « u1 ».', 'Duplicate schedule unit: “u1”.'],
    [
      "Une même équipe (#42) apparaît dans deux catégories : les catégories d'un événement doivent avoir des équipes distinctes.",
      'The same team (#42) appears in two categories: the categories of an event must have distinct teams.',
    ],
    ["Nourricier inconnu « x » pour l'unité « u1 ».", 'Unknown feeder “x” for unit “u1”.'],
    ['Format inconnu : « xyz ».', 'Unknown format: “xyz”.'],
    ['Trop de poules (5) pour 6 équipe(s).', 'Too many groups (5) for 6 team(s).'],
    [
      "Impossible de qualifier 3 équipe(s) : la plus petite poule n'en compte que 2.",
      'Cannot qualify 3 team(s): the smallest group only has 2.',
    ],
    [
      'Repêchage impossible : seulement 1 poule(s) comptent un 3ᵉ, on ne peut pas en repêcher 2.',
      'Runners-up impossible: only 1 group(s) reach position 3, so 2 cannot be picked.',
    ],
  ]

  test('messages statiques traduits en anglais', ({ assert }) => {
    for (const [message, expected] of STATIC) {
      assert.equal(tr('en', message), expected, `EN pour « ${message} »`)
    }
  })

  test('messages paramétrés traduits en anglais avec valeurs interpolées', ({ assert }) => {
    for (const [message, expected] of PARAM) {
      assert.equal(tr('en', message), expected, `EN pour « ${message} »`)
    }
  })

  test('en français, le message d’origine du scheduler est conservé (repli)', ({ assert }) => {
    for (const [message] of [...STATIC, ...PARAM]) {
      assert.equal(tr('fr', message), message)
    }
  })

  test('un message inconnu retombe sur lui-même (repli)', ({ assert }) => {
    const unknown = 'Un message que le scheduler ne produit pas.'
    assert.equal(tr('en', unknown), unknown)
    assert.equal(tr('fr', unknown), unknown)
  })

  /**
   * Garde-fou anti-dérive : on déclenche de **vraies** erreurs du scheduler et on
   * vérifie qu'elles sont bien reconnues et traduites. Si un message du module pur
   * change sans mise à jour du mappage, ces assertions échouent (au lieu d'un repli
   * FR silencieux).
   */
  test('erreurs réellement levées par le scheduler → traduites', ({ assert }) => {
    const team = (id: number): SlotSource => ({ type: 'team', teamId: id })

    assert.equal(
      translateThrown('en', () => buildKnockout({ entrants: [] })),
      'At least 2 qualified teams are required to build a single-elimination bracket.'
    )
    assert.equal(
      translateThrown('en', () => buildKnockout({ entrants: [team(1), team(1)] })),
      'A team appears twice among the qualified teams.'
    )
    assert.equal(
      translateThrown('en', () => buildDoubleElimination({ entrants: [team(1)] })),
      'At least 2 qualified teams are required for a double elimination.'
    )
  })
})
