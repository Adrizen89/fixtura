import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Équipes d'un tournoi — nom uniquement (aucune gestion de joueurs en v1).
 */
export default class extends BaseSchema {
  protected tableName = 'teams'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('tournament_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tournaments')
        .onDelete('CASCADE')

      table.string('name').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Pas deux équipes du même nom dans un même tournoi
      table.unique(['tournament_id', 'name'])
      table.index(['tournament_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
