import type { HttpContext } from '@adonisjs/core/http'
import Event from '#models/event'
import Tournament from '#models/tournament'
import { buildResultsData } from '#services/tournament_results'

/**
 * Écran public d'un **événement** multi-catégories (#32) — cf. CLAUDE.md §5, §9, §10.
 *
 * Accessible **sans authentification** via le `public_slug` non devinable
 * (`/e/:slug`). Strictement **lecture seule**. Il agrège toutes les catégories de
 * l'événement et permet de **naviguer entre elles** (onglets), chacune montrant son
 * planning + classement en direct. Chaque catégorie garde son propre canal SSE
 * (`tournaments/{public_slug}`), si bien que l'écran reste live sans polling.
 *
 * On n'expose que des données publiques (noms, scores) — jamais l'`id` de club, etc.
 */
export default class PublicEventController {
  async show({ inertia, params }: HttpContext) {
    const event = await Event.query().where('public_slug', params.slug).firstOrFail()

    const tournaments = await Tournament.query()
      .where('event_id', event.id)
      .preload('teams', (q) => q.orderBy('name'))
      .orderBy('created_at', 'asc')

    const categories = []
    for (const tournament of tournaments) {
      // Écran public : auteur de saisie non affiché → pas de préchargement (issue #41).
      const { matches, standings, pools } = await buildResultsData(tournament, {
        withUpdatedBy: false,
      })
      categories.push({
        id: tournament.id,
        name: tournament.name,
        category: tournament.category,
        status: tournament.status,
        publicSlug: tournament.publicSlug,
        format: tournament.format,
        matches,
        standings,
        pools,
      })
    }

    return inertia.render('public/event', {
      event: {
        name: event.name,
        eventDate: event.eventDate.toISODate(),
        status: event.status,
        publicSlug: event.publicSlug,
      },
      categories,
    })
  }
}
