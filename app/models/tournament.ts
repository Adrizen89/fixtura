import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import Team from '#models/team'
import Match from '#models/match'

export type TournamentStatus = 'draft' | 'scheduled' | 'live' | 'finished'

export default class Tournament extends BaseModel {
  /**
   * Scope `club_id` global et réutilisable (multi-tenant — cf. CLAUDE.md §5, §9, §12).
   *
   * Source unique de vérité du cloisonnement par club : tous les contrôleurs admin
   * l'appliquent via `Tournament.query().withScopes((s) => s.forClub(clubId))` plutôt
   * que de répéter `where('club_id', …)`. `Tournament` est la seule racine portant
   * `club_id` ; `Team` et `Match` n'en ont pas et ne sont atteints qu'à travers un
   * tournoi déjà scopé (leur `tournament_id` provient toujours d'un tournoi filtré ici),
   * ce qui garantit le cloisonnement de bout en bout sans colonne `club_id` dupliquée.
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

  @column()
  declare category: string

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

  @column()
  declare numTerrains: number

  @column()
  declare status: TournamentStatus

  @column()
  declare publicSlug: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  @hasMany(() => Team)
  declare teams: HasMany<typeof Team>

  @hasMany(() => Match)
  declare matches: HasMany<typeof Match>
}
