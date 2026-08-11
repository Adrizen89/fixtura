import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import db from '@adonisjs/lucid/services/db'

/**
 * Inscription publique d'une équipe (issue #112). Formulaire **minimal** (RGPD,
 * cf. §10) : nom d'équipe + e-mail de contact. Messages FR globaux
 * (`start/validator.ts`).
 *
 * L'unicité du nom dans le tournoi est vérifiée ici pour un retour clair à l'usager
 * — parmi les équipes confirmées **et** les demandes déjà en attente (#113), pour
 * éviter deux demandes homonymes. Le service `team_registration` la revérifie en
 * transaction (garde anti-concurrence). Requiert les métadonnées { tournamentId }.
 */
const uniqueTeamName = vine.createRule(
  async (value: unknown, _options: undefined, field: FieldContext) => {
    if (!field.isValid || typeof value !== 'string') {
      return
    }

    const { tournamentId } = field.meta as { tournamentId: number }
    const lower = value.trim().toLowerCase()

    const existingTeam = await db
      .from('teams')
      .where('tournament_id', tournamentId)
      .whereRaw('lower(name) = ?', [lower])
      .select('id')
      .first()

    const pendingRequest = await db
      .from('team_registrations')
      .where('tournament_id', tournamentId)
      .where('status', 'pending')
      .whereRaw('lower(team_name) = ?', [lower])
      .select('id')
      .first()

    if (existingTeam || pendingRequest) {
      field.report('Une équipe porte déjà ce nom dans ce tournoi.', 'database.unique', field)
    }
  }
)

export const teamRegistrationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(60).use(uniqueTeamName()),
    contactEmail: vine.string().trim().email().maxLength(255),
  })
)

/**
 * Réglages d'inscription côté organisateur (admin) : ouverture/fermeture et
 * capacité facultative (null = illimité). La capacité, quand fournie, est un
 * entier ≥ 1.
 */
export const registrationSettingsValidator = vine.compile(
  vine.object({
    open: vine.boolean(),
    capacity: vine.number().withoutDecimals().min(1).max(1000).nullable().optional(),
  })
)
