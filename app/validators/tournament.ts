import vine from '@vinejs/vine'

/** HH:mm (00:00 → 23:59). */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
/** YYYY-MM-DD. */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Création / édition d'un tournoi (mêmes règles pour les deux).
 * Les champs numériques acceptent les chaînes numériques (coercition VineJS).
 */
export const tournamentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    category: vine.string().trim().minLength(1).maxLength(60),
    eventDate: vine.string().trim().regex(DATE_REGEX),
    startTime: vine.string().trim().regex(TIME_REGEX),
    matchDurationMin: vine.number().min(1).max(240),
    breakDurationMin: vine.number().min(0).max(120),
    lunchStart: vine.string().trim().regex(TIME_REGEX).nullable().optional(),
    lunchDurationMin: vine.number().min(0).max(180),
    numTerrains: vine.number().min(1).max(20),
  })
)
