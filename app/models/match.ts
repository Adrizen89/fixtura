import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tournament from '#models/tournament'
import Team from '#models/team'
import User from '#models/user'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'forfeit'

export default class Match extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tournamentId: number

  @column()
  declare roundNumber: number

  @column()
  declare terrainNumber: number

  @column.dateTime()
  declare scheduledAt: DateTime

  @column()
  declare homeTeamId: number

  @column()
  declare awayTeamId: number

  @column()
  declare homeScore: number | null

  @column()
  declare awayScore: number | null

  @column()
  declare status: MatchStatus

  @column()
  declare forfeitTeamId: number | null

  @column()
  declare updatedByUserId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Tournament)
  declare tournament: BelongsTo<typeof Tournament>

  @belongsTo(() => Team, { foreignKey: 'homeTeamId' })
  declare homeTeam: BelongsTo<typeof Team>

  @belongsTo(() => Team, { foreignKey: 'awayTeamId' })
  declare awayTeam: BelongsTo<typeof Team>

  @belongsTo(() => Team, { foreignKey: 'forfeitTeamId' })
  declare forfeitTeam: BelongsTo<typeof Team>

  @belongsTo(() => User, { foreignKey: 'updatedByUserId' })
  declare updatedByUser: BelongsTo<typeof User>
}
