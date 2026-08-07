import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tournament from '#models/tournament'
import Team from '#models/team'
import User from '#models/user'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'forfeit'

/** Phase du match dans la compétition (cf. #42). */
export type MatchStage = 'main' | 'pool' | 'knockout'

/** Manière dont un slot (domicile/extérieur) est rempli tant qu'il n'est pas résolu. */
export type SlotSourceType = 'team' | 'match_winner' | 'match_loser' | 'pool_rank'

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

  // Nullable : en bracket, le participant peut être différé (« vainqueur de X »).
  @column()
  declare homeTeamId: number | null

  @column()
  declare awayTeamId: number | null

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

  // --- Phase & position (brackets, #42) ---
  @column()
  declare stage: MatchStage

  @column()
  declare groupLabel: string | null

  @column()
  declare bracketRound: string | null

  @column()
  declare bracketSlot: number | null

  // --- Source du slot domicile quand l'équipe n'est pas encore connue ---
  @column()
  declare homeSourceType: SlotSourceType | null

  @column()
  declare homeSourceMatchId: number | null

  @column()
  declare homeSourcePool: string | null

  @column()
  declare homeSourceRank: number | null

  // --- Source du slot extérieur ---
  @column()
  declare awaySourceType: SlotSourceType | null

  @column()
  declare awaySourceMatchId: number | null

  @column()
  declare awaySourcePool: string | null

  @column()
  declare awaySourceRank: number | null

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
