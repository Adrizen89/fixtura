import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Résolution d'un match nul en élimination directe (issue #105, sous-issue de #97).
 *
 * En phase à élimination, un match ne peut pas rester nul : il faut désigner un
 * vainqueur (tirs au but / prolongation) pour que la progression du bracket avance.
 * `shootout_winner_team_id` mémorise ce vainqueur **quand les scores sont à égalité** ;
 * il reste null pour un match décidé au score, un match de poule (nul autorisé) ou
 * non joué.
 *
 * `onDelete('SET NULL')` : supprimer une équipe ne casse pas le match.
 */
export default class extends BaseSchema {
  protected tableName = 'matches'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('shootout_winner_team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('teams')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('shootout_winner_team_id')
    })
  }
}
