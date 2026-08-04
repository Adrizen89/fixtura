import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Matchs générés par le scheduler puis joués le jour J.
 * Le classement n'est JAMAIS stocké : il est recalculé à la volée depuis les
 * matchs terminés (cf. CLAUDE.md §5). Le forfait est un statut, pas une suppression.
 */
export default class extends BaseSchema {
  protected tableName = 'matches'

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

      // Placement dans le planning
      table.integer('round_number').unsigned().notNullable()
      table.integer('terrain_number').unsigned().notNullable()
      table.timestamp('scheduled_at', { useTz: true }).notNullable()

      // Équipes
      table
        .integer('home_team_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
      table
        .integer('away_team_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')

      // Résultat (null tant que non saisi) — toujours corrigeable
      table.integer('home_score').unsigned().nullable()
      table.integer('away_score').unsigned().nullable()

      table
        .enu('status', ['scheduled', 'live', 'finished', 'forfeit'])
        .notNullable()
        .defaultTo('scheduled')

      // Équipe déclarée forfait, le cas échéant
      table
        .integer('forfeit_team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('teams')
        .onDelete('SET NULL')

      // Traçabilité : qui a saisi/corrigé en dernier (concurrence « dernier écrit gagne »)
      table
        .integer('updated_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['tournament_id'])
      table.index(['tournament_id', 'round_number'])
      table.index(['tournament_id', 'terrain_number'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
