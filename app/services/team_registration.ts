import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Team from '#models/team'
import type Tournament from '#models/tournament'

/**
 * Inscription publique d'une équipe à un tournoi (issue #112) — logique métier
 * isolée hors des contrôleurs (cf. CLAUDE.md §8). Sans compte, **sans paiement**.
 *
 * L'orga ouvre/ferme les inscriptions (`registrationOpen`) et fixe une capacité
 * facultative. Le lien public passe par un `registrationToken` non devinable,
 * généré à la première ouverture. La « fermeture pleine » n'est jamais stockée :
 * elle est dérivée du nombre d'équipes vs la capacité, si bien qu'ajouter/retirer
 * une équipe rouvre/referme naturellement le formulaire.
 */

/** État effectif du formulaire public d'inscription. */
export type RegistrationStatus = 'closed' | 'open' | 'full'

/** Jeton non devinable du lien d'inscription (192 bits, URL-safe). */
export function generateRegistrationToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * État effectif du formulaire, à partir de l'intention de l'orga
 * (`registrationOpen`), de la capacité et du nombre d'équipes déjà inscrites.
 */
export function registrationStatusFor(
  tournament: Pick<Tournament, 'registrationOpen' | 'registrationCapacity'>,
  teamsCount: number
): RegistrationStatus {
  if (!tournament.registrationOpen) return 'closed'
  const capacity = tournament.registrationCapacity
  if (capacity !== null && teamsCount >= capacity) return 'full'
  return 'open'
}

/** Places restantes (null si aucune capacité définie), jamais négatif. */
export function remainingSlots(
  tournament: Pick<Tournament, 'registrationCapacity'>,
  teamsCount: number
): number | null {
  const capacity = tournament.registrationCapacity
  if (capacity === null) return null
  return Math.max(0, capacity - teamsCount)
}

/**
 * Ouvre les inscriptions : garantit un jeton (généré à la première ouverture,
 * conservé ensuite pour ne pas invalider un lien déjà partagé) et fixe la capacité.
 */
export async function openRegistration(
  tournament: Tournament,
  capacity: number | null
): Promise<void> {
  tournament.registrationOpen = true
  tournament.registrationCapacity = capacity
  if (!tournament.registrationToken) {
    tournament.registrationToken = generateRegistrationToken()
  }
  await tournament.save()
}

/** Ferme les inscriptions (le jeton est conservé : réouverture = même lien). */
export async function closeRegistration(tournament: Tournament): Promise<void> {
  tournament.registrationOpen = false
  await tournament.save()
}

/** Erreurs métier : inscriptions fermées / complètes / doublon de nom. */
export class RegistrationClosedError extends Error {
  constructor() {
    super('Les inscriptions sont fermées pour ce tournoi.')
  }
}

export class RegistrationFullError extends Error {
  constructor() {
    super('Le tournoi est complet.')
  }
}

export class DuplicateTeamNameError extends Error {
  constructor() {
    super('Une équipe porte déjà ce nom dans ce tournoi.')
  }
}

export interface RegisterTeamInput {
  name: string
  contactEmail: string
}

/**
 * Inscrit une équipe de façon atomique : (ré)ouverture, capacité et unicité du nom
 * sont revérifiées **dans une transaction** (le contrôle en amont peut être périmé
 * sous la concurrence du jour J). Lève une erreur métier explicite sinon.
 */
export async function registerTeam(
  tournament: Tournament,
  input: RegisterTeamInput
): Promise<Team> {
  const name = input.name.trim()
  const contactEmail = input.contactEmail.trim().toLowerCase()

  return db.transaction(async (trx) => {
    if (!tournament.registrationOpen) {
      throw new RegistrationClosedError()
    }

    const { count } = await trx
      .from('teams')
      .where('tournament_id', tournament.id)
      .count('* as count')
      .first()
    const teamsCount = Number(count)

    if (tournament.registrationCapacity !== null && teamsCount >= tournament.registrationCapacity) {
      throw new RegistrationFullError()
    }

    const duplicate = await trx
      .from('teams')
      .where('tournament_id', tournament.id)
      .whereRaw('lower(name) = ?', [name.toLowerCase()])
      .select('id')
      .first()
    if (duplicate) {
      throw new DuplicateTeamNameError()
    }

    const team = await Team.create(
      { tournamentId: tournament.id, name, contactEmail },
      { client: trx }
    )
    return team
  })
}
