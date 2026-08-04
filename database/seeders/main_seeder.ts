import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Club from '#models/club'
import User from '#models/user'

/**
 * Amorce v1 : un unique club + un organisateur « owner ».
 * Idempotent (updateOrCreate) — rejouable sans doublon.
 *
 * Identifiants de dev :
 *   email    : owner@fixtura.test
 *   password : password
 */
export default class extends BaseSeeder {
  async run() {
    const club = await Club.updateOrCreate(
      { slug: 'club-demo' },
      { name: 'Club Démo', slug: 'club-demo' }
    )

    await User.updateOrCreate(
      { email: 'owner@fixtura.test' },
      {
        clubId: club.id,
        fullName: 'Organisateur Démo',
        email: 'owner@fixtura.test',
        password: 'password',
        role: 'owner',
      }
    )
  }
}
