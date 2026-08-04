import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Un tournoi = 1 événement = 1 catégorie = 1 championnat (round-robin simple).
 * Contient tous les paramètres horaires nécessaires à la génération du planning.
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

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

      table.string('name').notNullable()
      table.string('category').notNullable()
      table.date('event_date').notNullable()

      // Paramètres horaires
      table.time('start_time').notNullable()
      table.integer('match_duration_min').unsigned().notNullable()
      table.integer('break_duration_min').unsigned().notNullable().defaultTo(0)
      table.time('lunch_start').nullable()
      table.integer('lunch_duration_min').unsigned().notNullable().defaultTo(0)
      table.integer('num_terrains').unsigned().notNullable().defaultTo(1)

      table
        .enu('status', ['draft', 'scheduled', 'live', 'finished'])
        .notNullable()
        .defaultTo('draft')

      // Slug public non devinable, pour l'écran/lien public en lecture seule
      table.string('public_slug').notNullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['club_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
