import { randomBytes } from 'node:crypto'

/**
 * Slugifie une chaîne : minuscules, sans accents, tirets, alphanumérique.
 */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * Génère un slug public NON devinable pour l'accès en lecture seule
 * (`/t/:public_slug`). Base lisible issue du nom + suffixe aléatoire.
 */
export function generatePublicSlug(name: string): string {
  const base = slugify(name) || 'tournoi'
  const suffix = randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  return `${base}-${suffix}`
}
