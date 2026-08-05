import vine from '@vinejs/vine'

/**
 * Saisie / correction du score d'un match.
 * Les deux scores sont requis pour valider un résultat (entiers ≥ 0).
 * Les chaînes numériques sont coercées par VineJS.
 */
export const matchScoreValidator = vine.compile(
  vine.object({
    homeScore: vine.number().withoutDecimals().min(0).max(99),
    awayScore: vine.number().withoutDecimals().min(0).max(99),
  })
)
