import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Événement (v2 — issue #32) : regroupe plusieurs tournois (= catégories : U9 / U11
 * / U13…) tournant le **même jour sur un pool de terrains partagé**.
 *
 * L'événement porte les ressources et paramètres **communs** à toutes ses
 * catégories : la date, le pool de terrains (`num_terrains`) et le rythme de la
 * journée (heure de début, durée de match, pause entre matchs, pause déjeuner). La
 * génération du planning place alors les matchs de toutes les catégories sur cette
 * grille unique, sans collision de créneau × terrain.
 *
 * `club_id` dès le jour 1 (multi-tenant — cf. CLAUDE.md §5, §9). Slug public non
 * devinable pour l'écran public d'événement (`/e/:public_slug`, lecture seule).
 */
export default class extends BaseSchema {
  protected tableName = 'events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('club_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clubs')
        .onDelete('CASCADE')

      table.string('name').notNullable()
      table.date('event_date').notNullable()

      // Paramètres horaires partagés par toutes les catégories de l'événement.
      table.time('start_time').notNullable()
      table.integer('match_duration_min').unsigned().notNullable()
      table.integer('break_duration_min').unsigned().notNullable().defaultTo(0)
      table.time('lunch_start').nullable()
      table.integer('lunch_duration_min').unsigned().notNullable().defaultTo(0)

      // Pool de terrains partagé entre toutes les catégories.
      table.integer('num_terrains').unsigned().notNullable().defaultTo(1)

      table
        .enu('status', ['draft', 'scheduled', 'live', 'finished'])
        .notNullable()
        .defaultTo('draft')

      table.string('public_slug').notNullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['club_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
