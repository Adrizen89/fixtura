import vine from '@vinejs/vine'

/**
 * Personnalisation du club (logo + couleur) pour l'écran public — issue #40.
 *
 * Le logo est reçu et stocké comme **data-URI** (encodé côté client) : pas de fichier
 * sur disque, aucune ressource tierce (RGPD, §10). Une valeur **vide** signifie
 * « retirer » (logo ou couleur), d'où l'alternance `^$|…` dans les motifs.
 */

/** data-URI d'image autorisée (png / jpeg / webp / svg), base64 — ou vide (suppression). */
const LOGO_DATA_URI = /^$|^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/
/** Couleur hex "#rrggbb" — ou vide (couleur par défaut). */
const HEX_COLOR = /^$|^#[0-9a-fA-F]{6}$/

/** ~220 Ko binaires une fois encodés en base64 (garde-fou taille du data-URI). */
const MAX_LOGO_LENGTH = 300_000

export const clubBrandingValidator = vine.compile(
  vine.object({
    logo: vine.string().regex(LOGO_DATA_URI).maxLength(MAX_LOGO_LENGTH).optional(),
    primaryColor: vine.string().trim().regex(HEX_COLOR).optional(),
  })
)
