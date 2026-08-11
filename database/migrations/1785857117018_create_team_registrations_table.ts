import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Demandes d'inscription en ligne d'une équipe (issue #113, sous-issue de #100).
 *
 * L'inscription publique (issue #112) ne crée plus directement une équipe : elle
 * dépose une **demande** que l'organisateur valide ou refuse. La table conserve les
 * demandes dans leurs trois états (`pending` / `approved` / `rejected`) — une demande
 * refusée est **archivée**, jamais supprimée (traçabilité + notification à l'équipe).
 *
 * Colonnes :
 *   - `tournament_id`        : tournoi visé (cascade : purge avec le tournoi).
 *   - `team_name`            : nom demandé (l'équipe n'existe pas tant qu'elle n'est
 *                              pas validée).
 *   - `contact_email`        : e-mail de contact (RGPD, cf. §10) — sert à notifier la
 *                              décision ; jamais exposé sur l'écran public.
 *   - `status`               : `pending` à la soumission, puis `approved`/`rejected`.
 *   - `team_id`              : équipe créée lors de la validation (null sinon ; mis à
 *                              null si l'équipe est supprimée ensuite).
 *   - `decided_by_user_id`   : organisateur ayant statué (null tant qu'en attente).
 *   - `decided_at`           : horodatage de la décision (null tant qu'en attente).
 */
export default class extends BaseSchema {
  protected tableName = 'team_registrations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tournament_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tournaments')
        .onDelete('CASCADE')
      table.string('team_name').notNullable()
      table.string('contact_email').notNullable()
      table.string('status').notNullable().defaultTo('pending')
      table
        .integer('team_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('teams')
        .onDelete('SET NULL')
      table
        .integer('decided_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('decided_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Listing admin scopé tournoi + filtré par état (en attente / validées / refusées).
      table.index(['tournament_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
