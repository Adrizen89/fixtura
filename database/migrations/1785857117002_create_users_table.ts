import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Organisateurs. Rattachés à un club (scoping multi-tenant). Rôle owner|organizer.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

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

      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.enu('role', ['owner', 'organizer']).notNullable().defaultTo('organizer')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['club_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
