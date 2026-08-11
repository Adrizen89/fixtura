import { test } from '@japa/runner'
import type { ErrorEvent } from '@sentry/node'
import { scrubEvent, reportError, isErrorReportingActive } from '#services/error_reporter'

/**
 * Suivi des erreurs serveur (issue #118) — on teste la partie **pure** et la
 * garde RGPD (§10), sans jamais initialiser le SDK (pas de `SENTRY_DSN` en test).
 */
test.group('error_reporter · RGPD & sûreté', () => {
  test('scrubEvent retire toute donnée potentiellement personnelle de la requête', ({ assert }) => {
    const event = {
      request: {
        url: 'https://fixtura.fr/tournaments/1',
        method: 'POST',
        cookies: { session: 'secret' },
        headers: { authorization: 'Bearer x', cookie: 'session=secret' },
        data: { email: 'joueur@example.com' },
        query_string: 'token=abc',
      },
      user: { id: '42', email: 'orga@example.com', ip_address: '1.2.3.4' },
    } as unknown as ErrorEvent

    const scrubbed = scrubEvent(event)

    assert.isUndefined(scrubbed.request?.cookies)
    assert.isUndefined(scrubbed.request?.headers)
    assert.isUndefined(scrubbed.request?.data)
    assert.isUndefined(scrubbed.request?.query_string)
    assert.isUndefined(scrubbed.user)
    // Les métadonnées non personnelles (URL, méthode) sont conservées.
    assert.equal(scrubbed.request?.url, 'https://fixtura.fr/tournaments/1')
    assert.equal(scrubbed.request?.method, 'POST')
  })

  test('scrubEvent est robuste quand la requête est absente', ({ assert }) => {
    const event = { message: 'boom' } as ErrorEvent
    assert.doesNotThrow(() => scrubEvent(event))
  })

  test('le suivi est désactivé par défaut (aucun SENTRY_DSN en test)', ({ assert }) => {
    assert.isFalse(isErrorReportingActive())
  })

  test('reportError est un no-op sûr quand le suivi est inactif', ({ assert }) => {
    assert.doesNotThrow(() => reportError(new Error('boom'), { method: 'GET', url: '/x' }))
  })
})
