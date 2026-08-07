import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Invitations d'organisateurs (issue #35, onboarding multi-club).
 *
 * Un responsable (`owner`) invite un organisateur par email : une invitation porte
 * un **jeton** non devinable et une **expiration**. L'acceptation (parcours public
 * `/invitations/:token`) crée l'utilisateur dans le club avec le rôle prévu, puis
 * marque `accepted_at`. Rattachée au club (cloisonnement multi-tenant, issue #34).
 */
export default class extends BaseSchema {
  protected tableName = 'invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('club_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clubs')
        .onDelete('CASCADE')

      table.string('email', 254).notNullable()
      table.enu('role', ['owner', 'organizer']).notNullable().defaultTo('organizer')
      table.string('token').notNullable().unique()

      // Auteur de l'invitation (conservée si le compte est supprimé → SET NULL).
      table
        .integer('invited_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('expires_at').notNullable()
      table.timestamp('accepted_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['club_id'])
      table.index(['email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
