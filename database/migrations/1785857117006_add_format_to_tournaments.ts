import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Fondations « formats de tournoi » (#42) : format + configuration JSON.
 * Rétro-compatible — `format` par défaut `championship`, donc les tournois v1
 * restent valides sans reprise de données.
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enu('format', ['championship', 'pools', 'knockout', 'hybrid'])
        .notNullable()
        .defaultTo('championship')
      // Paramètres propres au format : numPools, qualifiersPerPool, thirdPlace…
      table.jsonb('format_config').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('format')
      table.dropColumn('format_config')
    })
  }
}
