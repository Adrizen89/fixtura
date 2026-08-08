import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Perf différée (issue #41) : index composite `(tournament_id, scheduled_at)` sur
 * `matches`.
 *
 * Toutes les lectures « planning / résultats / classement » filtrent par
 * `tournament_id` puis trient par `scheduled_at` (écran public, grille de saisie,
 * exports, diffusion SSE). L'index existant `(tournament_id)` ne couvre pas le tri :
 * Postgres devait re-trier en mémoire. Cet index sert à la fois le filtre et l'ordre.
 * Gain négligeable au volume v1 (cf. audit perf, PR #29), utile avant montée en charge.
 */
export default class extends BaseSchema {
  protected tableName = 'matches'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['tournament_id', 'scheduled_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['tournament_id', 'scheduled_at'])
    })
  }
}
