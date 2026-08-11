import { test } from '@japa/runner'
import {
  API_VERSION,
  serializeMatch,
  serializeStanding,
  serializeTournamentPayload,
  serializeEventPayload,
} from '#services/public_api'
import type { StandingRow } from '#services/standings'
import type { ResultRow } from '#services/realtime'

function standing(over: Partial<StandingRow> = {}): StandingRow {
  return {
    rank: 1,
    teamId: 1,
    teamName: 'Alpha',
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 2,
    goalsAgainst: 0,
    goalDifference: 2,
    points: 3,
    ...over,
  }
}

function resultRow(over: Partial<ResultRow> = {}): ResultRow {
  return {
    id: 10,
    time: '09:00',
    terrainNumber: 1,
    homeTeam: 'Alpha',
    awayTeam: 'Bravo',
    homeTeamId: 1,
    awayTeamId: 2,
    homeScore: 2,
    awayScore: 0,
    status: 'finished',
    forfeitSide: null,
    shootoutWinnerSide: null,
    updatedBy: 'orga@club', // ne doit PAS fuiter dans le contrat public
    updatedAt: '2026-06-01T09:10:00.000Z',
    stage: 'main',
    bracketRound: null,
    bracketSlot: null,
    groupLabel: null,
    ...over,
  }
}

test.group('public_api · mappers', () => {
  test('le classement est mappé sur les champs publics (nom, pas d’id)', ({ assert }) => {
    const s = serializeStanding(standing({ teamName: 'Les Aigles', points: 6 }))
    assert.deepEqual(s, {
      rank: 1,
      team: 'Les Aigles',
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 6,
    })
    assert.notProperty(s, 'teamId')
  })

  test('un match n’expose que des données publiques (pas d’auteur de saisie ni d’id)', ({
    assert,
  }) => {
    const m = serializeMatch(resultRow())
    assert.equal(m.home, 'Alpha')
    assert.equal(m.away, 'Bravo')
    assert.equal(m.homeScore, 2)
    assert.equal(m.status, 'finished')
    assert.equal(m.terrain, 1)
    // Champs internes jamais exposés.
    assert.notProperty(m, 'id')
    assert.notProperty(m, 'updatedBy')
    assert.notProperty(m, 'homeTeamId')
  })

  test('le payload tournoi est versionné et structuré', ({ assert }) => {
    const payload = serializeTournamentPayload(
      'Club Test',
      {
        name: 'Tournoi',
        category: 'U11',
        date: '2026-06-01',
        status: 'finished',
        format: 'championship',
        slug: 'abc',
      },
      { standings: [standing()], pools: [], matches: [resultRow()] }
    )

    assert.equal(payload.apiVersion, API_VERSION)
    assert.equal(payload.club.name, 'Club Test')
    assert.equal(payload.tournament.slug, 'abc')
    assert.lengthOf(payload.standings, 1)
    assert.lengthOf(payload.matches, 1)
    assert.isArray(payload.pools)
  })

  test('le payload événement agrège les catégories', ({ assert }) => {
    const payload = serializeEventPayload(
      'Club Test',
      { name: 'Événement', date: '2026-06-01', status: 'live', slug: 'evt' },
      [
        {
          meta: {
            name: 'U11',
            category: 'U11',
            date: '2026-06-01',
            status: 'live',
            format: 'championship',
            slug: 'c1',
          },
          data: { standings: [standing()], pools: [], matches: [resultRow()] },
        },
      ]
    )

    assert.equal(payload.apiVersion, API_VERSION)
    assert.equal(payload.event.slug, 'evt')
    assert.lengthOf(payload.categories, 1)
    assert.equal(payload.categories[0].slug, 'c1')
    assert.lengthOf(payload.categories[0].standings, 1)
  })
})
