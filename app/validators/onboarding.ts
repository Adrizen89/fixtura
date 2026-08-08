import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import db from '@adonisjs/lucid/services/db'

/**
 * Validation des parcours d'onboarding (issue #35) : inscription d'un club,
 * invitation d'organisateurs, acceptation d'invitation, changement de rôle.
 * Messages FR fournis globalement (cf. `start/validator.ts`, CLAUDE.md §8).
 */

/**
 * Unicité de l'adresse e-mail parmi **tous** les comptes (l'email est l'identifiant
 * de connexion, unique en base). Comparaison insensible à la casse.
 */
const uniqueUserEmail = vine.createRule(
  async (value: unknown, _options: undefined, field: FieldContext) => {
    if (!field.isValid || typeof value !== 'string') {
      return
    }

    const existing = await db
      .from('users')
      .whereRaw('lower(email) = ?', [value.toLowerCase()])
      .select('id')
      .first()

    if (existing) {
      field.report('Un compte existe déjà avec cette adresse e-mail.', 'database.unique', field)
    }
  }
)

/** Inscription d'un club : club + premier organisateur (owner). */
export const registerValidator = vine.compile(
  vine.object({
    clubName: vine.string().trim().minLength(2).maxLength(100),
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().toLowerCase().use(uniqueUserEmail()),
    password: vine.string().minLength(8).maxLength(100).confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

/** Invitation d'un organisateur (email + rôle). L'unicité côté club est vérifiée au contrôleur. */
export const invitationValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().toLowerCase(),
    role: vine.enum(['owner', 'organizer']),
  })
)

/** Acceptation d'une invitation : le nouvel organisateur choisit son nom + mot de passe. */
export const acceptInvitationValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    password: vine.string().minLength(8).maxLength(100).confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

/** Changement du rôle d'un membre. */
export const memberRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['owner', 'organizer']),
  })
)
