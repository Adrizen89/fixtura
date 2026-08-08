import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Barème de points configurable par tournoi (issue #104, sous-issue de #97).
 *
 * Jusqu'ici victoire = 3 / nul = 1 / défaite = 0 étaient codés en dur dans le
 * service de classement. On les matérialise en colonnes (défaut football 3/1/0),
 * pour permettre un barème par tournoi (ex. 2/1/0). Le service `standings` reste
 * pur : il reçoit ces valeurs en paramètre.
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('win_points').notNullable().defaultTo(3)
      table.integer('draw_points').notNullable().defaultTo(1)
      table.integer('loss_points').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('win_points')
      table.dropColumn('draw_points')
      table.dropColumn('loss_points')
    })
  }
}
