import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Double élimination (issue #111) : autorise la valeur `'double_elimination'` sur
 * la colonne `tournaments.format`.
 *
 * `format` est contraint par un CHECK Postgres (`tournaments_format_check`, cf. #42)
 * successivement remplacé par chaque nouveau format (#110 y a ajouté `'swiss'`). On
 * le réécrit ici avec la **liste complète** des formats — cette migration doit
 * rester la dernière à toucher la contrainte pour rester l'autorité.
 */
export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.tableName}_format_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_format_check ` +
        `CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid', 'swiss', 'double_elimination'))`
    )
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS ${this.tableName}_format_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_format_check ` +
        `CHECK (format IN ('championship', 'pools', 'knockout', 'hybrid', 'swiss'))`
    )
  }
}
