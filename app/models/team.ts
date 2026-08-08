import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tournament from '#models/tournament'

export default class Team extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tournamentId: number

  @column()
  declare name: string

  /**
   * Contact minimal de l'équipe, renseigné lors d'une inscription publique
   * (issue #112). Nullable : les équipes ajoutées par l'organisateur n'en ont pas.
   * Donnée personnelle (RGPD, cf. §10) — jamais exposée sur l'écran public.
   */
  @column()
  declare contactEmail: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tournament)
  declare tournament: BelongsTo<typeof Tournament>
}
