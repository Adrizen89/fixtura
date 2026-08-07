import { test } from '@japa/runner'
import Tournament from '#models/tournament'
import Event from '#models/event'

/**
 * Verrouille le scope multi-tenant réutilisable `Tournament.forClub`
 * (cf. CLAUDE.md §5, §9, §12 · issue #7).
 *
 * `scope()` de Lucid renvoie le callback tel quel : on peut donc l'exercer
 * unitairement avec un faux query builder, sans DB. On vérifie que le seul
 * effet du scope est d'ajouter la contrainte `where('club_id', clubId)` — la
 * garantie de cloisonnement sur laquelle reposent tous les contrôleurs admin.
 */
test.group('multi-tenant · Tournament.forClub', () => {
  /** Faux query builder qui enregistre les appels `.where()` et reste chaînable. */
  function queryStub() {
    const calls: Array<{ column: string; value: unknown }> = []
    const builder = {
      calls,
      where(column: string, value: unknown) {
        calls.push({ column, value })
        return this
      },
    }
    return builder
  }

  test('applique une contrainte where club_id et rien d’autre', ({ assert }) => {
    const query = queryStub()

    Tournament.forClub(query as never, 42)

    assert.deepEqual(query.calls, [{ column: 'club_id', value: 42 }])
  })

  test('transmet l’identifiant de club reçu', ({ assert }) => {
    const clubA = queryStub()
    const clubB = queryStub()

    Tournament.forClub(clubA as never, 1)
    Tournament.forClub(clubB as never, 7)

    assert.equal(clubA.calls[0].value, 1)
    assert.equal(clubB.calls[0].value, 7)
  })
})

/**
 * Même garantie de cloisonnement pour la nouvelle entité `Event` (#32) : son scope
 * `forClub` est la source unique du filtrage par club appliqué par les contrôleurs
 * d'événements (cf. critère « club_id respecté sur la nouvelle entité »).
 */
test.group('multi-tenant · Event.forClub', () => {
  function queryStub() {
    const calls: Array<{ column: string; value: unknown }> = []
    const builder = {
      calls,
      where(column: string, value: unknown) {
        calls.push({ column, value })
        return this
      },
    }
    return builder
  }

  test('applique une contrainte where club_id et rien d’autre', ({ assert }) => {
    const query = queryStub()

    Event.forClub(query as never, 42)

    assert.deepEqual(query.calls, [{ column: 'club_id', value: 42 }])
  })
})
