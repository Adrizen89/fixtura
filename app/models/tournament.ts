import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Club from '#models/club'
import Event from '#models/event'
import Team from '#models/team'
import Match from '#models/match'
import { withTenantScope } from '#models/concerns/tenant_scoped'
import type { Scoring } from '#services/standings'

export type TournamentStatus = 'draft' | 'scheduled' | 'live' | 'finished'

/** Format de compétition (cf. #42 — championnat par défaut en v1 ; suisse #110). */
export type TournamentFormat = 'championship' | 'pools' | 'knockout' | 'hybrid' | 'swiss'

/** Paramètres propres au format, stockés en JSON (`format_config`). */
export interface TournamentFormatConfig {
  numPools?: number
  qualifiersPerPool?: number
  thirdPlace?: boolean
  /** Système suisse (#110) : nombre de rondes ; absent = auto ⌈log₂(N)⌉. */
  swissRounds?: number
}

export default class Tournament extends compose(BaseModel, withTenantScope()) {
  /**
   * Cloisonnement par club (multi-tenant — cf. CLAUDE.md §5, §9, §12).
   *
   * Depuis l'issue #34, le filtrage sur `club_id` est **automatique** : le mixin
   * `withTenantScope` applique le club courant (`TenantContext`) à toute lecture, si
   * bien que les contrôleurs n'ont plus à appeler `forClub`. `Tournament` est la
   * seule racine (avec `Event`) portant `club_id` ; `Team` et `Match` n'en ont pas
   * et ne sont atteints qu'à travers un tournoi déjà filtré, ce qui garantit le
   * cloisonnement de bout en bout sans colonne `club_id` dupliquée.
   *
   * Le scope nommé `forClub` reste disponible pour les usages **hors requête** (CLI
   * `club:export` / `club:delete`, services), où aucun club courant n'est défini et
   * où l'on cible un club explicite.
   */
  static forClub = scope((query, clubId: number) => {
    query.where('club_id', clubId)
  })

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clubId: number

  /**
   * Événement de rattachement (v2 — issue #32). Nullable : un tournoi « autonome »
   * (flux MVP) peut exister sans événement ; une catégorie d'un événement multi-
   * catégories le référence. Le pool de terrains et le rythme de la journée
   * proviennent alors de l'événement, pas des colonnes horaires du tournoi.
   */
  @column()
  declare eventId: number | null

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

  /** Barème de points configurable (issue #104) — défaut football 3 / 1 / 0. */
  @column()
  declare winPoints: number

  @column()
  declare drawPoints: number

  @column()
  declare lossPoints: number

  /**
   * Inscription publique d'une équipe (issue #112). `registrationOpen` est
   * l'intention de l'orga ; le lien public passe par `registrationToken` (non
   * devinable, distinct du `publicSlug` des résultats). La « fermeture pleine » est
   * dérivée du nombre d'équipes vs `registrationCapacity` (jamais stockée).
   */
  @column()
  declare registrationOpen: boolean

  @column()
  declare registrationToken: string | null

  @column()
  declare registrationCapacity: number | null

  @column()
  declare status: TournamentStatus

  @column()
  declare publicSlug: string

  @column()
  declare format: TournamentFormat

  /** Config sérialisée en JSONB ; le driver pg peut rendre un objet ou une chaîne. */
  @column({
    prepare: (value: TournamentFormatConfig | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | TournamentFormatConfig | null) =>
      value === null || value === undefined
        ? null
        : typeof value === 'string'
          ? (JSON.parse(value) as TournamentFormatConfig)
          : value,
  })
  declare formatConfig: TournamentFormatConfig | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>

  @hasMany(() => Team)
  declare teams: HasMany<typeof Team>

  @hasMany(() => Match)
  declare matches: HasMany<typeof Match>

  /** Barème du tournoi, prêt à passer au service de classement pur (issue #104). */
  get scoring(): Scoring {
    return { win: this.winPoints, draw: this.drawPoints, loss: this.lossPoints }
  }
}
