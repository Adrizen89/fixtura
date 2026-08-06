import vine from '@vinejs/vine'

/** HH:mm (00:00 → 23:59). */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Décaler un match (aléa du jour J — cf. CLAUDE.md §9, issue #6).
 * Nouvelle heure murale (obligatoire) et, éventuellement, changement de terrain.
 * La borne haute de `terrainNumber` (≤ nombre de terrains du tournoi) est vérifiée
 * dans le contrôleur, qui connaît le tournoi.
 */
export const matchScheduleValidator = vine.compile(
  vine.object({
    time: vine.string().trim().regex(TIME_REGEX),
    terrainNumber: vine.number().withoutDecimals().min(1).max(20).optional(),
  })
)

/**
 * Déclarer un forfait (aléa du jour J — cf. CLAUDE.md §9, issue #6).
 * On désigne le *côté* forfaitaire (domicile / extérieur) ; le contrôleur en
 * déduit l'équipe et matérialise le score réglementaire.
 */
export const matchForfeitValidator = vine.compile(
  vine.object({
    side: vine.enum(['home', 'away'] as const),
  })
)
