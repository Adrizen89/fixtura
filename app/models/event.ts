import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import Tournament from '#models/tournament'
import { withTenantScope } from '#models/concerns/tenant_scoped'

export type EventStatus = 'draft' | 'scheduled' | 'live' | 'finished'

/**
 * Événement (v2 — issue #32) : regroupe plusieurs `tournaments` (catégories) le
 * même jour sur un **pool de terrains partagé**. Porte les ressources et
 * paramètres communs (date, terrains, rythme de la journée) ; chaque catégorie ne
 * conserve que son identité propre (nom, format, équipes).
 */
export default class Event extends compose(BaseModel, withTenantScope()) {
  /**
   * Cloisonnement par club (multi-tenant — cf. CLAUDE.md §5, §9, §12), aligné sur
   * `Tournament`. Depuis l'issue #34, le filtrage sur `club_id` est **automatique**
   * (mixin `withTenantScope` + `TenantContext`) : les contrôleurs n'appellent plus
   * `forClub`. Le scope nommé reste utile hors requête (CLI, services) où l'on cible
   * un club explicite.
   */
  static forClub = scope((query, clubId: number) => {
    query.where('club_id', clubId)
  })

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clubId: number

  @column()
  declare name: string

  @column.date()
  declare eventDate: DateTime

  /** Heure de début au format "HH:mm" (colonne SQL time). */
  @column()
  declare startTime: string

  @column()
  declare matchDurationMin: number

  @column()
  declare breakDurationMin: number

  /** Heure de début de la pause déjeuner "HH:mm", ou null si pas de pause. */
  @column()
  declare lunchStart: string | null

  @column()
  declare lunchDurationMin: number

  /** Pool de terrains partagé entre toutes les catégories. */
  @column()
  declare numTerrains: number

  @column()
  declare status: EventStatus

  @column()
  declare publicSlug: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  @hasMany(() => Tournament)
  declare tournaments: HasMany<typeof Tournament>
}
