import { test } from '@japa/runner'
import { tournamentChannel } from '#services/realtime'

test.group('realtime · tournamentChannel', () => {
  test('dérive le nom de canal depuis le public_slug', ({ assert }) => {
    assert.equal(tournamentChannel('abc-123'), 'tournaments/abc-123')
  })

  test('reste stable — le client s’abonne à la même convention', ({ assert }) => {
    // Ce contrat est partagé avec le composable useLiveTournament côté front.
    const slug = 'tournoi-ete-x7K9'
    assert.equal(tournamentChannel(slug), `tournaments/${slug}`)
  })
})
