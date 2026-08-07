import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'

/**
 * Tests fonctionnels de l'authentification (guard session « web »).
 *
 * Couvre le runtime que les tests unitaires n'exercent pas : chiffrement /
 * cookies de session (config/encryption.ts), middleware auth, rendu Inertia.
 * Chaque test est isolé par une transaction globale annulée à la fin.
 */
test.group('Auth (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function createOwner() {
    const club = await Club.create({ name: 'Club Func', slug: 'club-func' })
    return User.create({
      clubId: club.id,
      fullName: 'Orga Func',
      email: 'orga-func@test.fixtura',
      password: 'password',
      role: 'owner',
    })
  }

  test('la page de connexion répond', async ({ client }) => {
    const res = await client.get('/login')
    res.assertStatus(200)
  })

  test('un visiteur non connecté est redirigé vers /login', async ({ client }) => {
    const res = await client.get('/tournaments').redirects(0)
    res.assertStatus(302)
  })

  test('des identifiants invalides ne connectent pas', async ({ client }) => {
    await createOwner()
    const res = await client
      .post('/login')
      .form({ email: 'orga-func@test.fixtura', password: 'mauvais' })
      .redirects(0)
    res.assertStatus(302)
  })

  test('un organisateur connecté accède au tableau de bord', async ({ client }) => {
    const user = await createOwner()
    const res = await client.get('/tournaments').loginAs(user).redirects(0)
    res.assertStatus(200)
  })
})
