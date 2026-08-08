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
    // Vainqueur aux tirs au but (élimination, issue #105) : requis seulement quand un
    // match à élimination finit nul — la règle métier est appliquée côté service.
    // Nullable : le formulaire envoie toujours le champ (null quand non concerné).
    shootoutWinner: vine.enum(['home', 'away']).nullable().optional(),
  })
)
