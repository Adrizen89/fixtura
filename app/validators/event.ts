import vine from '@vinejs/vine'

/** HH:mm (00:00 → 23:59). */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
/** YYYY-MM-DD. */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Création / édition d'un événement (#32). L'événement porte les paramètres
 * **communs** à toutes ses catégories : la date, le pool de terrains et le rythme
 * de la journée. Les champs numériques acceptent les chaînes numériques (coercition
 * VineJS), comme le validator de tournoi.
 */
export const eventValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    eventDate: vine.string().trim().regex(DATE_REGEX),
    startTime: vine.string().trim().regex(TIME_REGEX),
    matchDurationMin: vine.number().min(1).max(240),
    breakDurationMin: vine.number().min(0).max(120),
    lunchStart: vine.string().trim().regex(TIME_REGEX).nullable().optional(),
    lunchDurationMin: vine.number().min(0).max(180),
    numTerrains: vine.number().min(1).max(20),
  })
)

/**
 * Ajout d'une catégorie (= un tournoi) à un événement. Une catégorie n'a que son
 * identité propre : nom, libellé de catégorie et format. Les formats supportés dans
 * un événement multi-catégories sont **championnat** et **poules** (round-robin, tous
 * les participants connus) — la cohérence fine (nombre de poules ≤ équipes…) est
 * vérifiée à la génération par le scheduler, qui renvoie une erreur explicite.
 */
export const eventCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    category: vine.string().trim().minLength(1).maxLength(60),
    format: vine.enum(['championship', 'pools']),
    numPools: vine.number().min(2).max(64).nullable().optional(),
  })
)
