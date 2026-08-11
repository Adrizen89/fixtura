import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import db from '@adonisjs/lucid/services/db'

/**
 * Unicité du nom d'équipe au sein d'un même tournoi (cf. CLAUDE.md §5).
 * Comparaison insensible à la casse ; en renommage, l'équipe courante est exclue.
 *
 * S'appuie sur les métadonnées passées au validateur :
 *   { tournamentId: number, teamId?: number }
 */
const uniqueTeamName = vine.createRule(
  async (value: unknown, _options: undefined, field: FieldContext) => {
    // Ne pas requêter si le format est déjà invalide (champ vide, mauvais type…).
    if (!field.isValid || typeof value !== 'string') {
      return
    }

    const { tournamentId, teamId } = field.meta as {
      tournamentId: number
      teamId?: number
    }

    const query = db
      .from('teams')
      .where('tournament_id', tournamentId)
      .whereRaw('lower(name) = ?', [value.toLowerCase()])

    if (teamId) {
      query.whereNot('id', teamId)
    }

    const existing = await query.select('id').first()
    if (existing) {
      field.report('Une équipe porte déjà ce nom dans ce tournoi.', 'database.unique', field)
    }
  }
)

/**
 * Ajout / renommage d'une équipe — nom uniquement (aucune gestion de joueurs, cf. CLAUDE.md §3).
 * Requiert les métadonnées { tournamentId, teamId? } au moment de la validation.
 */
export const teamValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(60).use(uniqueTeamName()),
  })
)

/**
 * Confirmation d'un import d'équipes (issue #120) : liste de noms retenus dans
 * l'aperçu. On borne le format ici (1–60 caractères) ; la déduplication et
 * l'unicité vis-à-vis des équipes déjà présentes sont réappliquées à l'insertion
 * (le service `team_import` reste la source de vérité, l'aperçu pouvant être
 * périmé). `distinct` interdit les doublons exacts dans la charge utile.
 */
export const teamImportValidator = vine.compile(
  vine.object({
    names: vine
      .array(vine.string().trim().minLength(1).maxLength(60))
      .minLength(1)
      .maxLength(500)
      .distinct(),
  })
)
