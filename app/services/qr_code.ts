import QRCode from 'qrcode-svg'

/**
 * Génération de QR codes en **SVG**, côté serveur (issue #40).
 *
 * Rendu inline (aucun service tiers, aucune image externe → RGPD, cf. CLAUDE.md §10)
 * et vectoriel : net à l'écran comme à l'impression pour l'affichage terrain. Sert à
 * pointer vers l'écran public d'un tournoi (`/t/:public_slug`).
 */

/** URL publique absolue d'un tournoi à partir de l'origine de la requête. */
export function publicTournamentUrl(origin: string, publicSlug: string): string {
  return `${origin.replace(/\/+$/, '')}/t/${publicSlug}`
}

/** SVG d'un QR code encodant `content` (correction d'erreur moyenne, tracé fusionné). */
export function qrSvg(content: string): string {
  return new QRCode({
    content,
    padding: 2,
    width: 320,
    height: 320,
    color: '#000000',
    background: '#ffffff',
    ecl: 'M',
    // `join` fusionne les modules en un seul tracé : SVG plus léger et rendu net.
    join: true,
  }).svg()
}
