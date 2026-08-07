import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import Tournament from '#models/tournament'

export type EventStatus = 'draft' | 'scheduled' | 'live' | 'finished'

/**
 * Événement (v2 — issue #32) : regroupe plusieurs `tournaments` (catégories) le
 * même jour sur un **pool de terrains partagé**. Porte les ressources et
 * paramètres communs (date, terrains, rythme de la journée) ; chaque catégorie ne
 * conserve que son identité propre (nom, format, équipes).
 */
export default class Event extends BaseModel {
  /**
   * Scope `club_id` réutilisable (multi-tenant — cf. CLAUDE.md §5, §9, §12), aligné
   * sur `Tournament.forClub`. Source unique du cloisonnement par club : les
   * contrôleurs l'appliquent via `Event.query().withScopes((s) => s.forClub(clubId))`.
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
