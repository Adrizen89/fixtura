import type { I18n } from '@adonisjs/i18n'
import type { SchedulerError } from '#services/scheduler/index'

/**
 * Localisation des messages du **scheduler** (issue #123).
 *
 * Le module `app/services/scheduler/` est le cœur pur et le plus sensible du projet :
 * on ne le modifie pas pour l'i18n. On traduit ici, en aval, ses messages (français,
 * source de vérité) vers une clé du catalogue `resources/lang/en/scheduler.json`.
 *
 * **Repli FR sans dérive** : seul le catalogue **anglais** existe. `i18n.t(clé, params,
 * fallback)` renvoie la traduction EN pour une requête anglaise, et **le message FR
 * d'origine** (`error.message`, passé en fallback) pour une requête française — donc le
 * texte français reste exactement celui émis par le scheduler, sans duplication.
 *
 * Les messages **statiques** sont mappés par égalité exacte ; les messages
 * **paramétrés** par expression régulière (extraction des valeurs interpolées). Tout
 * message non reconnu retombe sur `error.message` (français). Le test
 * `tests/unit/scheduler_i18n.spec.ts` verrouille la couverture.
 */

/** Message FR exact → code de traduction (`scheduler.<code>`). */
const STATIC_CODES: Record<string, string> = {
  'Des équipes sont présentes en double.': 'duplicateTeams',
  'Il faut au moins 2 équipes pour générer un planning.': 'needTwoTeams',
  'Il faut au moins 1 terrain.': 'needOneTerrain',
  "La durée d'un match doit être d'au moins 1 minute.": 'matchDurationMin',
  'La pause entre matchs ne peut pas être négative.': 'breakNegative',
  'La durée de la pause déjeuner ne peut pas être négative.': 'lunchNegative',
  'Aucun match à planifier.': 'noMatches',
  "Il faut au moins 2 qualifiés pour construire un arbre d'élimination directe.":
    'needTwoQualifiersKnockout',
  'Une même équipe apparaît deux fois parmi les qualifiés.': 'duplicateQualifiers',
  'Il faut au moins 2 qualifiés pour une double élimination.': 'needTwoQualifiersDoubleElim',
  'Il faut au moins 2 équipes pour former des poules.': 'needTwoTeamsPools',
  'Il faut au moins 1 poule.': 'needOnePool',
  'Le système suisse se génère ronde par ronde.': 'swissRoundByRound',
  'Le nombre de poules (format_config.numPools) est requis (≥ 1).': 'numPoolsRequired',
  'Le nombre de qualifiés par poule doit être ≥ 1.': 'qualifiersPerPoolMin',
  'Le nombre de repêchés doit être un entier ≥ 0.': 'bestRunnersUpMin',
  'Il faut au moins 2 qualifiés pour une phase finale.': 'needTwoQualifiersFinal',
  'Impossible de générer un planning respectant les contraintes avec ces paramètres. Augmentez le nombre de terrains ou réduisez les pauses.':
    'infeasibleConstraints',
  'Incohérence interne du bracket : deux byes appariés (entrées invalides).':
    'internalBracketError',
  'Petite finale impossible avec ces qualifiés : il faut deux demi-finales réellement disputées (au moins 4 qualifiés, sans bye en demi-finale).':
    'thirdPlaceImpossible',
}

/** Message FR paramétré → code + extraction des valeurs interpolées. */
interface ParamPattern {
  re: RegExp
  code: string
  params: (m: RegExpMatchArray) => Record<string, string>
}

const PARAM_PATTERNS: ParamPattern[] = [
  {
    re: /^Heure invalide : « (.+?) » \(format attendu HH:mm\)\.$/,
    code: 'invalidTime',
    params: (m) => ({ time: m[1] }),
  },
  {
    re: /^Unité de planning en double : « (.+?) »\.$/,
    code: 'duplicateUnit',
    params: (m) => ({ key: m[1] }),
  },
  {
    re: /^Une même équipe \(#(\d+)\) apparaît dans deux catégories/,
    code: 'teamInTwoCategories',
    params: (m) => ({ teamId: m[1] }),
  },
  {
    re: /^Nourricier inconnu « (.+?) » pour l'unité « (.+?) »\.$/,
    code: 'unknownFeeder',
    params: (m) => ({ feeder: m[1], key: m[2] }),
  },
  {
    re: /^Format inconnu : « (.+?) »\.$/,
    code: 'unknownFormat',
    params: (m) => ({ format: m[1] }),
  },
  {
    re: /^Trop de poules \((\d+)\) pour (\d+) équipe\(s\)\.$/,
    code: 'tooManyPools',
    params: (m) => ({ pools: m[1], teams: m[2] }),
  },
  {
    re: /^Impossible de qualifier (\d+) équipe\(s\) : la plus petite poule n'en compte que (\d+)\.$/,
    code: 'qualifiersExceedPool',
    params: (m) => ({ qualifiers: m[1], smallest: m[2] }),
  },
  {
    re: /^Repêchage impossible : seulement (\d+) poule\(s\) comptent un (\d+)ᵉ, on ne peut pas en repêcher (\d+)\.$/,
    code: 'runnersUpImpossible',
    params: (m) => ({ available: m[1], position: m[2], requested: m[3] }),
  },
]

/**
 * Traduit un `SchedulerError` selon la locale de `i18n`. Renvoie la traduction
 * anglaise (avec valeurs interpolées) si la requête est en anglais, sinon le message
 * français d'origine. Un message non reconnu retombe toujours sur `error.message`.
 */
export function translateSchedulerError(i18n: I18n, error: SchedulerError): string {
  const staticCode = STATIC_CODES[error.message]
  if (staticCode) {
    return i18n.t(`scheduler.${staticCode}`, {}, error.message)
  }

  for (const pattern of PARAM_PATTERNS) {
    const match = error.message.match(pattern.re)
    if (match) {
      return i18n.t(`scheduler.${pattern.code}`, pattern.params(match), error.message)
    }
  }

  return error.message
}
