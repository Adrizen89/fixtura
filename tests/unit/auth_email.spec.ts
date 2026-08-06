import { test } from '@japa/runner'
import { loginValidator } from '#validators/auth'
import { normalizeEmail } from '#models/user'

/**
 * Régression : `normalizeEmail()` (validator.js) retirait les points des adresses
 * Gmail, cassant la connexion quand l'email était stocké avec ses points (issue #11).
 * La règle est désormais unique : `trim` + minuscules, points conservés — appliquée
 * au stockage (modèle User) comme à la connexion (loginValidator).
 */

test.group('auth · normalisation email', () => {
  test('conserve les points d’une adresse Gmail', ({ assert }) => {
    assert.equal(normalizeEmail('adri.veille.tech@gmail.com'), 'adri.veille.tech@gmail.com')
  })

  test('met en minuscules et retire les espaces, sans toucher aux points', ({ assert }) => {
    assert.equal(normalizeEmail('  Adri.Veille.Tech@Gmail.com  '), 'adri.veille.tech@gmail.com')
  })
})

test.group('auth · loginValidator', () => {
  test('la connexion normalise comme le stockage (minuscules, points conservés)', async ({
    assert,
  }) => {
    const { email } = await loginValidator.validate({
      email: '  Adri.Veille.Tech@Gmail.com  ',
      password: 'secret',
    })
    // Doit correspondre exactement à l'email stocké normalisé par le modèle.
    assert.equal(email, normalizeEmail('adri.veille.tech@gmail.com'))
    assert.equal(email, 'adri.veille.tech@gmail.com')
  })

  test('accepte une adresse Gmail à points quelle que soit la casse', async ({ assert }) => {
    const { email } = await loginValidator.validate({
      email: 'A.B.C@GMAIL.COM',
      password: 'secret',
    })
    assert.equal(email, 'a.b.c@gmail.com')
  })
})
