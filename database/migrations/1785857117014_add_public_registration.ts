import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Inscription publique d'une équipe à un tournoi (issue #112, sous-issue de #100).
 *
 * Une équipe s'inscrit elle-même via un lien public non devinable, sans compte et
 * sans paiement. On ajoute au tournoi :
 *   - `registration_open`      : l'orga ouvre / ferme les inscriptions.
 *   - `registration_token`     : jeton non devinable du lien public (généré à la
 *                                première ouverture ; distinct du `public_slug` de
 *                                l'écran de résultats pour que fermer les
 *                                inscriptions ne masque pas les résultats).
 *   - `registration_capacity`  : capacité max (nb d'équipes). Fermeture « pleine »
 *                                dérivée du nombre d'équipes (jamais stockée).
 *
 * Et à l'équipe un contact minimal (RGPD, cf. §10) :
 *   - `contact_email`          : e-mail de la personne inscrivant l'équipe. Nullable
 *                                (les équipes ajoutées par l'orga n'en ont pas).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tournaments', (table) => {
      table.boolean('registration_open').notNullable().defaultTo(false)
      table.string('registration_token').nullable().unique()
      table.integer('registration_capacity').nullable()
    })

    this.schema.alterTable('teams', (table) => {
      table.string('contact_email').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tournaments', (table) => {
      table.dropColumn('registration_open')
      table.dropColumn('registration_token')
      table.dropColumn('registration_capacity')
    })

    this.schema.alterTable('teams', (table) => {
      table.dropColumn('contact_email')
    })
  }
}
