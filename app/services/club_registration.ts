import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Club from '#models/club'
import User from '#models/user'

/**
 * Inscription d'un club (issue #35, onboarding) : crée le club **et** son premier
 * organisateur `owner`, de façon transactionnelle (soit les deux, soit aucun).
 * Logique isolée hors du contrôleur (cf. CLAUDE.md §8).
 */

/** Slugifie un nom de club (minuscules, sans accents, alphanumérique + tirets). */
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
 * Slug de club unique : on tente d'abord le slug « propre » issu du nom, puis on
 * ajoute un suffixe aléatoire court en cas de collision (slug lisible mais unique).
 */
async function uniqueClubSlug(name: string): Promise<string> {
  const base = slugify(name) || 'club'

  const taken = await Club.findBy('slug', base)
  if (!taken) return base

  // Collision improbable ensuite (suffixe aléatoire) ; on boucle par prudence.
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(4).toString('hex').slice(0, 6)
    const candidate = `${base}-${suffix}`
    const exists = await Club.findBy('slug', candidate)
    if (!exists) return candidate
  }
  // Dernier recours : suffixe plus long, quasi certainement libre.
  return `${base}-${randomBytes(8).toString('hex')}`
}

export interface RegisterClubInput {
  clubName: string
  fullName: string
  email: string
  password: string
}

/**
 * Crée un club + son `owner`. L'email est normalisé/haché par le modèle `User`
 * (hooks existants). Retourne l'utilisateur créé (à connecter par le contrôleur).
 */
export async function registerClub(input: RegisterClubInput): Promise<User> {
  const slug = await uniqueClubSlug(input.clubName)

  return db.transaction(async (trx) => {
    const club = await Club.create({ name: input.clubName.trim(), slug }, { client: trx })

    const user = await User.create(
      {
        clubId: club.id,
        fullName: input.fullName.trim(),
        email: input.email,
        password: input.password,
        role: 'owner',
      },
      { client: trx }
    )

    return user
  })
}
