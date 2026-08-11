import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tournament from '#models/tournament'
import Team from '#models/team'
import User from '#models/user'

/** État d'une demande d'inscription (issue #113). */
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * Demande d'inscription en ligne d'une équipe (issue #113).
 *
 * Déposée par le formulaire public (#112), elle attend la décision de l'organisateur.
 * Pas de colonne `club_id` : comme `Team` et `Match`, elle n'est atteinte qu'à travers
 * un `Tournament` déjà filtré par le club courant (cloisonnement de bout en bout,
 * cf. §9). Une demande refusée est conservée (archivée), jamais supprimée.
 */
export default class TeamRegistration extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tournamentId: number

  @column()
  declare teamName: string

  /** Contact de l'équipe — sert à notifier la décision. Donnée personnelle (RGPD, §10). */
  @column()
  declare contactEmail: string

  @column()
  declare status: RegistrationRequestStatus

  /** Équipe créée lors de la validation (null tant que la demande n'est pas validée). */
  @column()
  declare teamId: number | null

  @column()
  declare decidedByUserId: number | null

  @column.dateTime()
  declare decidedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tournament)
  declare tournament: BelongsTo<typeof Tournament>

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => User, { foreignKey: 'decidedByUserId' })
  declare decidedBy: BelongsTo<typeof User>

  /** Une demande en attente de décision. */
  get isPending(): boolean {
    return this.status === 'pending'
  }
}
