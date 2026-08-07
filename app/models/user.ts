import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Club from '#models/club'

/**
 * Rôles applicatifs (issue #34, rôles consolidés) :
 *  - `owner`     : responsable du club — actions de cycle de vie / destructrices,
 *    gestion des données du club (export/effacement RGPD).
 *  - `organizer` : organisateur du jour J — création/édition, saisie des résultats.
 *
 * Source unique du type et de la liste des rôles (référencée par le seeder, les
 * validators et les policies).
 */
export const USER_ROLES = ['owner', 'organizer'] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Règle unique de normalisation d'email : `trim` + minuscules, points CONSERVÉS.
 * On ne retire jamais les points (contrairement à `normalizeEmail()` de
 * validator.js, qui cassait les adresses Gmail « a.b@gmail.com »). Utilisée au
 * stockage (hook ci-dessous) ; le `loginValidator` applique la même règle côté
 * connexion, pour une comparaison cohérente et insensible à la casse.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clubId: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: UserRole

  /** Raccourci de rôle, utilisé par les policies (cf. `app/policies`). */
  get isOwner(): boolean {
    return this.role === 'owner'
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Club)
  declare club: BelongsTo<typeof Club>

  /**
   * Normalise l'email avant chaque écriture (création via seeder, futur
   * formulaire, mise à jour) : stockage toujours en minuscules, points conservés.
   */
  @beforeSave()
  static async normalizeEmailBeforeSave(user: User) {
    if (user.email) {
      user.email = normalizeEmail(user.email)
    }
  }
}
