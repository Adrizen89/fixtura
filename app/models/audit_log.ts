import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import User from '#models/user'

/**
 * Entrée du journal d'audit (issue #117). Append-only : pas d'`updatedAt`.
 * Le cloisonnement par club est appliqué explicitement à la lecture (filtrage
 * `club_id`) et à l'écriture (le `clubId` est fixé depuis l'utilisateur connecté).
 */
export default class AuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clubId: number

  /** Auteur de l'action ; nullable (compte retiré ensuite → SET NULL). */
  @column()
  declare userId: number | null

  /** Instantané de l'email de l'auteur, pour rester lisible après suppression. */
  @column()
  declare actorEmail: string | null

  /** Code d'action (cf. `AUDIT_ACTIONS`). */
  @column()
  declare action: string

  /** Libellé lisible de la cible (nom de tournoi, email d'un membre…). */
  @column()
  declare target: string | null

  /** Contexte additionnel sérialisé en JSONB (ex. { from, to }). */
  @column({
    prepare: (value: Record<string, unknown> | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | Record<string, unknown> | null) =>
      value === null || value === undefined
        ? null
        : typeof value === 'string'
          ? (JSON.parse(value) as Record<string, unknown>)
          : value,
  })
  declare metadata: Record<string, unknown> | null

  @column()
  declare ip: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
