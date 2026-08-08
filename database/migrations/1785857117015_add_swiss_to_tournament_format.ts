import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Système suisse (issue #110) : autorise la valeur `'swiss'` sur la colonne
 * `tournaments.format`.
 *
 * `format` a été créée via `table.enu(...)` (migration #006), ce qui produit une
 * **contrainte CHECK** Postgres (`tournaments_format_check`) figeant les valeurs
 * permises. On la remplace pour y ajouter `'swiss'` (les autres colonnes de format
 * — `format_config`, `swissRounds` — vivent dans le JSON existant, sans migration).
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.tableName}_format_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_format_check ` +
        `CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid', 'swiss'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.tableName}_format_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_format_check ` +
        `CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid'))`
    )
  }
}
