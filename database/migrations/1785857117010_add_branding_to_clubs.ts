import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Personnalisation du club sur l'écran public (issue #40).
 *
 * - `logo` : le logo est stocké **en base sous forme de data-URI** (petit fichier,
 *   ≤ ~200 Ko), servi inline sur l'écran public. Zéro fichier sur disque, aucune
 *   ressource tierce (RGPD, cf. CLAUDE.md §10) et persistance garantie entre
 *   déploiements du VPS.
 * - `primary_color` : couleur d'accent du club au format hex "#rrggbb" (ou null →
 *   vert « terrain » par défaut).
 *
 * Colonnes nullables : le club v1 existant reste valide sans personnalisation.
 */
export default class extends BaseSchema {
  protected tableName = 'clubs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('logo').nullable()
      table.string('primary_color', 9).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo')
      table.dropColumn('primary_color')
    })
  }
}
