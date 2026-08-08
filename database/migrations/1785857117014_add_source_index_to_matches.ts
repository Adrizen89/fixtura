import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Repêchage des meilleurs qualifiés inter-poules (issue #107, sous-issue #97).
 *
 * La source différée `pool_best` (« k-ᵉ meilleur (n)ᵉ de poule, toutes poules
 * confondues ») a besoin, en plus du rang (`*_source_rank`), d'un **index de
 * sélection** (1 = meilleur, 2 = deuxième meilleur…). On ajoute donc une colonne
 * d'index par slot. Nullable : sans repêchage, ces colonnes restent nulles.
 */
export default class extends BaseSchema {
  protected tableName = 'matches'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('home_source_index').unsigned().nullable()
      table.integer('away_source_index').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('home_source_index')
      table.dropColumn('away_source_index')
    })
  }
}
