import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Team from '#models/team'
import TeamRegistration from '#models/team_registration'
import type Tournament from '#models/tournament'
import type User from '#models/user'

/**
 * Inscription publique d'une équipe à un tournoi (issues #112 + #113) — logique
 * métier isolée hors des contrôleurs (cf. CLAUDE.md §8). Sans compte, **sans paiement**.
 *
 * L'orga ouvre/ferme les inscriptions (`registrationOpen`) et fixe une capacité
 * facultative. Le lien public passe par un `registrationToken` non devinable, généré
 * à la première ouverture.
 *
 * Depuis #113, une soumission publique ne crée plus directement une équipe : elle
 * dépose une **demande** (`TeamRegistration`, statut `pending`) que l'organisateur
 * valide (→ l'équipe est créée) ou refuse (→ demande archivée). La « fermeture
 * pleine » n'est jamais stockée : elle est dérivée de l'**occupation** — équipes
 * confirmées + demandes encore en attente — vs la capacité, si bien que valider,
 * refuser ou retirer une équipe rouvre/referme naturellement le formulaire.
 */

/** État effectif du formulaire public d'inscription. */
export type RegistrationStatus = 'closed' | 'open' | 'full'

/** Jeton non devinable du lien d'inscription (192 bits, URL-safe). */
export function generateRegistrationToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * État effectif du formulaire, à partir de l'intention de l'orga
 * (`registrationOpen`), de la capacité et de l'occupation courante (équipes
 * confirmées + demandes en attente).
 */
export function registrationStatusFor(
  tournament: Pick<Tournament, 'registrationOpen' | 'registrationCapacity'>,
  occupancy: number
): RegistrationStatus {
  if (!tournament.registrationOpen) return 'closed'
  const capacity = tournament.registrationCapacity
  if (capacity !== null && occupancy >= capacity) return 'full'
  return 'open'
}

/** Places restantes (null si aucune capacité définie), jamais négatif. */
export function remainingSlots(
  tournament: Pick<Tournament, 'registrationCapacity'>,
  occupancy: number
): number | null {
  const capacity = tournament.registrationCapacity
  if (capacity === null) return null
  return Math.max(0, capacity - occupancy)
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

/** Erreurs métier : inscriptions fermées / complètes / doublon de nom / déjà statuée. */
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

export class RegistrationNotPendingError extends Error {
  constructor() {
    super('Cette demande a déjà été traitée.')
  }
}

export interface RegisterTeamInput {
  name: string
  contactEmail: string
}

/**
 * Occupation courante d'un tournoi (équipes confirmées + demandes en attente),
 * calculée dans la transaction fournie pour rester juste sous la concurrence.
 */
async function occupancyCount(
  tournamentId: number,
  trx: TransactionClientContract
): Promise<number> {
  const teams = await trx
    .from('teams')
    .where('tournament_id', tournamentId)
    .count('* as count')
    .first()
  const pending = await trx
    .from('team_registrations')
    .where('tournament_id', tournamentId)
    .where('status', 'pending')
    .count('* as count')
    .first()
  return Number(teams?.count ?? 0) + Number(pending?.count ?? 0)
}

/**
 * Enregistre une **demande** d'inscription de façon atomique : (ré)ouverture,
 * capacité et unicité du nom (parmi les équipes confirmées **et** les demandes en
 * attente) sont revérifiées **dans une transaction** — le contrôle en amont peut être
 * périmé sous la concurrence du jour J. Lève une erreur métier explicite sinon.
 */
export async function submitRegistration(
  tournament: Tournament,
  input: RegisterTeamInput
): Promise<TeamRegistration> {
  const name = input.name.trim()
  const contactEmail = input.contactEmail.trim().toLowerCase()

  return db.transaction(async (trx) => {
    if (!tournament.registrationOpen) {
      throw new RegistrationClosedError()
    }

    if (tournament.registrationCapacity !== null) {
      const occupancy = await occupancyCount(tournament.id, trx)
      if (occupancy >= tournament.registrationCapacity) {
        throw new RegistrationFullError()
      }
    }

    if (await teamNameTaken(tournament.id, name, trx)) {
      throw new DuplicateTeamNameError()
    }

    return TeamRegistration.create(
      { tournamentId: tournament.id, teamName: name, contactEmail, status: 'pending' },
      { client: trx }
    )
  })
}

/**
 * Valide une demande : crée l'équipe dans le tournoi (avec son contact) et marque la
 * demande `approved`, dans une transaction. Le nom est revérifié pour éviter un
 * doublon apparu entre-temps (autre demande validée, ajout manuel). Retourne l'équipe.
 */
export async function approveRegistration(
  registration: TeamRegistration,
  decidedBy: User
): Promise<Team> {
  return db.transaction(async (trx) => {
    if (registration.status !== 'pending') {
      throw new RegistrationNotPendingError()
    }

    // À la validation, seul un doublon d'**équipe confirmée** bloque (une autre demande
    // en attente homonyme n'est pas une équipe ; la demande courante ne se compte pas).
    if (await confirmedTeamWithName(registration.tournamentId, registration.teamName, trx)) {
      throw new DuplicateTeamNameError()
    }

    const team = await Team.create(
      {
        tournamentId: registration.tournamentId,
        name: registration.teamName,
        contactEmail: registration.contactEmail,
      },
      { client: trx }
    )

    registration.useTransaction(trx)
    registration.merge({
      status: 'approved',
      teamId: team.id,
      decidedByUserId: decidedBy.id,
      decidedAt: DateTime.now(),
    })
    await registration.save()

    return team
  })
}

/** Refuse une demande : la marque `rejected` (archivée) sans créer d'équipe. */
export async function rejectRegistration(
  registration: TeamRegistration,
  decidedBy: User
): Promise<void> {
  if (registration.status !== 'pending') {
    throw new RegistrationNotPendingError()
  }

  registration.merge({
    status: 'rejected',
    decidedByUserId: decidedBy.id,
    decidedAt: DateTime.now(),
  })
  await registration.save()
}

/** Une équipe **confirmée** porte-t-elle déjà ce nom ? (garde à la validation) */
async function confirmedTeamWithName(
  tournamentId: number,
  name: string,
  trx: TransactionClientContract
): Promise<boolean> {
  const team = await trx
    .from('teams')
    .where('tournament_id', tournamentId)
    .whereRaw('lower(name) = ?', [name.toLowerCase()])
    .select('id')
    .first()
  return Boolean(team)
}

/** Un nom d'équipe est-il déjà pris (équipe confirmée ou demande en attente) ? */
async function teamNameTaken(
  tournamentId: number,
  name: string,
  trx: TransactionClientContract
): Promise<boolean> {
  if (await confirmedTeamWithName(tournamentId, name, trx)) return true

  const pending = await trx
    .from('team_registrations')
    .where('tournament_id', tournamentId)
    .where('status', 'pending')
    .whereRaw('lower(team_name) = ?', [name.toLowerCase()])
    .select('id')
    .first()
  return Boolean(pending)
}
