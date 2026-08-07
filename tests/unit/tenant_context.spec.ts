import { test } from '@japa/runner'
import { TenantContext } from '#tenancy/tenant_context'

/**
 * Contexte multi-tenant de requête (issue #34). Vérifie le comportement du club
 * courant : absent hors requête, présent dans le `run`, imbrication, et
 * échappatoire `bypass`. Pur (AsyncLocalStorage), sans DB.
 */
test.group('multi-tenant · TenantContext', () => {
  test('aucun club courant hors contexte', ({ assert }) => {
    assert.isNull(TenantContext.currentClubId())
  })

  test('expose le club courant à l’intérieur de run()', ({ assert }) => {
    const seen = TenantContext.run(42, () => TenantContext.currentClubId())
    assert.equal(seen, 42)
    // Refermé au retour.
    assert.isNull(TenantContext.currentClubId())
  })

  test('l’imbrication remplace le club courant puis le restaure', ({ assert }) => {
    TenantContext.run(1, () => {
      assert.equal(TenantContext.currentClubId(), 1)
      TenantContext.run(2, () => {
        assert.equal(TenantContext.currentClubId(), 2)
      })
      assert.equal(TenantContext.currentClubId(), 1)
    })
  })

  test('bypass() neutralise le contexte courant', ({ assert }) => {
    TenantContext.run(7, () => {
      assert.equal(TenantContext.currentClubId(), 7)
      const inside = TenantContext.bypass(() => TenantContext.currentClubId())
      assert.isNull(inside)
      // Restauré après le bypass.
      assert.equal(TenantContext.currentClubId(), 7)
    })
  })

  test('le contexte traverse les await', async ({ assert }) => {
    await TenantContext.run(9, async () => {
      await Promise.resolve()
      assert.equal(TenantContext.currentClubId(), 9)
    })
  })
})
