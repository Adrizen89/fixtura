import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Ajoute la valeur `double_elimination` à la contrainte de format des tournois
 * (issue #111). Le format est stocké en colonne texte avec une contrainte CHECK
 * (créée par `.enu(...)` en #42) : on la remplace pour autoriser le nouveau format,
 * sans reprise de données (les tournois existants gardent leur format).
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.raw('ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check')
    this.schema.raw(
      'ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check ' +
        "CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid', 'double_elimination'))"
    )
  }

  async down() {
    this.schema.raw('ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check')
    this.schema.raw(
      'ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check ' +
        "CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid'))"
    )
  }
}
