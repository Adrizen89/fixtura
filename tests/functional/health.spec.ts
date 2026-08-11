import { test } from '@japa/runner'

/**
 * Endpoints de santé (issue #118) — publics, sans auth, sans donnée personnelle.
 * `/up` = liveness minimal ; `/health` = readiness (base + métriques de base).
 */
test.group('Santé (fonctionnel)', () => {
  test('GET /up répond 200 { status: ok } sans authentification', async ({ client }) => {
    const response = await client.get('/up')
    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok' })
  })

  test('GET /health expose l’état de la base et des métriques de base', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/health')
    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok', checks: { database: 'ok' } })

    const body = response.body()
    assert.equal(body.checks.database, 'ok')
    assert.isNumber(body.uptimeSeconds)
    assert.isString(body.nodeVersion)
    assert.isNumber(body.memory.rssMb)
    // Suivi d'erreurs désactivé en test (pas de SENTRY_DSN).
    assert.equal(body.errorReporting, 'disabled')
    // Aucune donnée personnelle / métier ne doit fuiter dans la réponse.
    assert.notProperty(body, 'user')
    assert.notProperty(body, 'club')
  })
})
