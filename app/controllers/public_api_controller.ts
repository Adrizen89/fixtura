import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Event from '#models/event'
import { buildResultsData } from '#services/tournament_results'
import { serializeTournamentPayload, serializeEventPayload } from '#services/public_api'
import type { ApiTournamentMeta } from '#services/public_api'

/**
 * API de lecture publique (issue #122) — **JSON, lecture seule, sans auth**, via le
 * `public_slug` non devinable (cf. CLAUDE.md §5, §10). Destinée aux intégrations
 * tierces : planning, résultats et classement d'un tournoi ou d'un événement.
 *
 * Contrat **versionné** (`/api/v1/…`) et **stable** : la sérialisation passe par le
 * service pur `public_api`, découplé des structures internes. On n'expose que des
 * données publiques (noms, scores) — jamais d'`id` de club, d'organisateur ni de
 * contact. Rate-limité (middleware `throttle`, cf. issue #116). Contrôleur mince
 * (§8) : il ne fait que charger, réutiliser `buildResultsData`, puis sérialiser.
 */
export default class PublicApiController {
  private meta(t: Tournament): ApiTournamentMeta {
    return {
      name: t.name,
      category: t.category,
      date: t.eventDate.toISODate(),
      status: t.status,
      format: t.format,
      slug: t.publicSlug,
    }
  }

  /** GET /api/v1/tournaments/:slug — un tournoi (planning + résultats + classement). */
  async tournament({ params, response }: HttpContext) {
    const tournament = await Tournament.query()
      .where('public_slug', params.slug)
      .preload('teams', (q) => q.orderBy('name'))
      .preload('club')
      .first()

    if (!tournament) {
      return response.notFound({ apiVersion: '1', error: 'Tournoi introuvable.' })
    }

    const data = await buildResultsData(tournament, { withUpdatedBy: false })

    // Données publiques qui évoluent : cache court, partageable par un proxy.
    response.header('Cache-Control', 'public, max-age=30')
    return response.json(
      serializeTournamentPayload(tournament.club.name, this.meta(tournament), data)
    )
  }

  /** GET /api/v1/events/:slug — un événement et ses catégories. */
  async event({ params, response }: HttpContext) {
    const event = await Event.query().where('public_slug', params.slug).preload('club').first()

    if (!event) {
      return response.notFound({ apiVersion: '1', error: 'Événement introuvable.' })
    }

    const tournaments = await Tournament.query()
      .where('event_id', event.id)
      .preload('teams', (q) => q.orderBy('name'))
      .orderBy('created_at', 'asc')

    const categories = []
    for (const t of tournaments) {
      categories.push({
        meta: this.meta(t),
        data: await buildResultsData(t, { withUpdatedBy: false }),
      })
    }

    response.header('Cache-Control', 'public, max-age=30')
    return response.json(
      serializeEventPayload(
        event.club.name,
        {
          name: event.name,
          date: event.eventDate.toISODate(),
          status: event.status,
          slug: event.publicSlug,
        },
        categories
      )
    )
  }
}
