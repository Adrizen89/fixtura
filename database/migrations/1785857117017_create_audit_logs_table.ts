import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Journal d'audit des actions sensibles (issue #117, cf. §10).
 *
 * Trace **qui / quoi / quand** sur les actions à enjeu (connexion, changement de
 * rôle, suppressions, export RGPD…). Journal **append-only** (pas d'`updated_at`),
 * scopé par club, consultable par le responsable. `user_id` nullable + `actor_email`
 * en instantané pour rester lisible même si l'auteur est ensuite retiré du club.
 */
export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('club_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('clubs')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      // Instantané de l'auteur (survit à la suppression du compte).
      table.string('actor_email').nullable()
      // Code d'action (ex. `auth.login`, `member.role_changed`, `tournament.deleted`).
      table.string('action').notNullable()
      // Libellé lisible de la cible (ex. « Tournoi Pâques », email d'un membre).
      table.string('target').nullable()
      // Contexte additionnel (ex. { from: 'organizer', to: 'owner' }).
      table.jsonb('metadata').nullable()
      table.string('ip').nullable()
      table.timestamp('created_at').notNullable()

      // Lecture principale : les entrées d'un club, les plus récentes d'abord.
      table.index(['club_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
