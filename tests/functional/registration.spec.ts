import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Club from '#models/club'
import User from '#models/user'

/**
 * Inscription d'un club (issue #35) : crée le club + son premier `owner` et
 * connecte l'utilisateur. Couvre l'unicité de l'email et la confirmation du mot de
 * passe (validation VineJS + messages FR, §8).
 */
test.group('Onboarding · inscription club (fonctionnel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('crée un club + un owner et connecte', async ({ client, assert }) => {
    const res = await client
      .post('/register')
      .form({
        clubName: 'Club Test',
        fullName: 'Alice Martin',
        email: 'alice@test.fixtura',
        password: 'password',
        passwordConfirmation: 'password',
      })
      .redirects(0)
    res.assertStatus(302)

    const user = await User.findBy('email', 'alice@test.fixtura')
    assert.isNotNull(user)
    assert.equal(user!.role, 'owner')

    const club = await Club.find(user!.clubId)
    assert.isNotNull(club)
    assert.equal(club!.name, 'Club Test')
  })

  test('refuse un email déjà utilisé', async ({ client, assert }) => {
    const club = await Club.create({ name: 'Existant', slug: 'existant' })
    await User.create({
      clubId: club.id,
      fullName: 'Bob',
      email: 'bob@test.fixtura',
      password: 'password',
      role: 'owner',
    })

    const res = await client
      .post('/register')
      .form({
        clubName: 'Nouveau Club',
        fullName: 'Bob Bis',
        email: 'bob@test.fixtura',
        password: 'password',
        passwordConfirmation: 'password',
      })
      .redirects(0)
    res.assertStatus(302)

    // Aucun club supplémentaire créé.
    const clubs = await Club.all()
    assert.lengthOf(clubs, 1)
  })

  test('refuse une confirmation de mot de passe différente', async ({ client, assert }) => {
    const res = await client
      .post('/register')
      .form({
        clubName: 'Club Mismatch',
        fullName: 'Carole',
        email: 'carole@test.fixtura',
        password: 'password',
        passwordConfirmation: 'different',
      })
      .redirects(0)
    res.assertStatus(302)

    const user = await User.findBy('email', 'carole@test.fixtura')
    assert.isNull(user)
  })
})
