import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import User from '#models/user'
import type { UserRole } from '#models/user'
import { withTenantScope } from '#models/concerns/tenant_scoped'

/**
 * Invitation d'un organisateur à rejoindre un club (issue #35).
 *
 * Cloisonnement par club **automatique** (mixin `withTenantScope`, issue #34) :
 * dans l'espace membres (authentifié), les invitations sont filtrées sur le club
 * courant. Le parcours d'acceptation public (`/invitations/:token`) s'exécute hors
 * contexte tenant → la recherche par jeton n'est pas filtrée, comme attendu.
 */
export default class Invitation extends compose(BaseModel, withTenantScope()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clubId: number

  @column()
  declare email: string

  @column()
  declare role: UserRole

  @column()
  declare token: string

  @column()
  declare invitedByUserId: number | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare acceptedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  @belongsTo(() => User, { foreignKey: 'invitedByUserId' })
  declare invitedBy: BelongsTo<typeof User>

  /** Déjà acceptée (un compte a été créé à partir de cette invitation). */
  get isAccepted(): boolean {
    return this.acceptedAt !== null
  }

  /** Expirée (date d'expiration dépassée). */
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  /** En attente : ni acceptée, ni expirée → jeton encore utilisable. */
  get isPending(): boolean {
    return !this.isAccepted && !this.isExpired
  }
}
