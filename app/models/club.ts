import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Event from '#models/event'
import Tournament from '#models/tournament'

export default class Club extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  /**
   * Logo du club sous forme de **data-URI** (ex. `data:image/png;base64,…`), affiché
   * sur l'écran public. Stocké en base pour rester self-hébergé (RGPD, cf. §10). Null
   * → pas de logo. Cf. issue #40.
   */
  @column()
  declare logo: string | null

  /** Couleur d'accent du club au format hex "#rrggbb" (null → vert par défaut). */
  @column()
  declare primaryColor: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Event)
  declare events: HasMany<typeof Event>

  @hasMany(() => Tournament)
  declare tournaments: HasMany<typeof Tournament>
}
