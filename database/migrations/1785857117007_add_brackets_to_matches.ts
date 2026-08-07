import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Fondations « brackets » sur les matchs (#42).
 *
 * Participants différés : en élimination directe, un match est « vainqueur de X
 * vs vainqueur de Y » — l'équipe est inconnue à la génération. On rend donc
 * `home_team_id` / `away_team_id` nullable, et chaque slot peut décrire sa SOURCE
 * (vainqueur/perdant d'un match, rang de poule) tant que l'équipe n'est pas résolue.
 *
 * Rétro-compatible : les nouvelles colonnes sont nullable et `stage` vaut `main`
 * par défaut, donc les matchs v1 (championnat) restent valides sans reprise.
 */
export default class extends BaseSchema {
  protected tableName = 'matches'

  async up() {
    // Participants différés (bracket) : l'équipe peut être inconnue à la génération.
    this.schema.raw('ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL')
    this.schema.raw('ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL')

    this.schema.alterTable(this.tableName, (table) => {
      // Phase & position dans la compétition.
      table.string('stage').notNullable().defaultTo('main') // main | pool | knockout
      table.string('group_label').nullable() // poule : 'A', 'B'…
      table.string('bracket_round').nullable() // r16 | qf | sf | final | third
      table.integer('bracket_slot').unsigned().nullable()

      // Source du slot DOMICILE quand l'équipe n'est pas encore connue.
      table.string('home_source_type').nullable() // team | match_winner | match_loser | pool_rank
      table
        .integer('home_source_match_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('matches')
        .onDelete('SET NULL')
      table.string('home_source_pool').nullable()
      table.integer('home_source_rank').unsigned().nullable()

      // Source du slot EXTÉRIEUR (idem).
      table.string('away_source_type').nullable()
      table
        .integer('away_source_match_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('matches')
        .onDelete('SET NULL')
      table.string('away_source_pool').nullable()
      table.integer('away_source_rank').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stage')
      table.dropColumn('group_label')
      table.dropColumn('bracket_round')
      table.dropColumn('bracket_slot')
      table.dropColumn('home_source_type')
      table.dropColumn('home_source_match_id')
      table.dropColumn('home_source_pool')
      table.dropColumn('home_source_rank')
      table.dropColumn('away_source_type')
      table.dropColumn('away_source_match_id')
      table.dropColumn('away_source_pool')
      table.dropColumn('away_source_rank')
    })
    this.schema.raw('ALTER TABLE matches ALTER COLUMN home_team_id SET NOT NULL')
    this.schema.raw('ALTER TABLE matches ALTER COLUMN away_team_id SET NOT NULL')
  }
}
