import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetRateLimits } from '#services/rate_limit'

/**
 * Limitation de débit (issue #116) — vérifie de bout en bout que le login est
 * protégé contre le bruteforce : au-delà du quota par IP, l'endpoint répond **429**
 * (avec `Retry-After`) sans casser l'usage légitime en deçà. Le store mémoire est
 * remis à zéro avant chaque test (hook global, cf. tests/bootstrap.ts).
 */
test.group('Rate-limit login (fonctionnel)', (group) => {
  group.each.setup(() => {
    resetRateLimits()
    return testUtils.db().truncate()
  })

  const badLogin = (client: ApiClient) =>
    client.post('/login').form({ email: 'nobody@test.fixtura', password: 'wrongpass' }).redirects(0)

  test('sous le quota, les tentatives ne sont pas limitées', async ({ client, assert }) => {
    for (let i = 0; i < 10; i++) {
      const res = await badLogin(client)
      assert.notEqual(res.status(), 429, `tentative ${i + 1} ne doit pas être limitée`)
    }
  })

  test('au-delà de 10 tentatives / IP, le login répond 429', async ({ client, assert }) => {
    for (let i = 0; i < 10; i++) {
      await badLogin(client)
    }
    const blocked = await badLogin(client)
    blocked.assertStatus(429)
    assert.exists(blocked.header('retry-after'), 'un en-tête Retry-After est renvoyé')
  })
})
