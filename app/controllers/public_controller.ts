import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import { buildResultsData } from '#services/tournament_results'

/**
 * Écran public d'un tournoi (cf. CLAUDE.md §5, §9, §10).
 *
 * Accessible **sans authentification** via le `public_slug` non devinable
 * (`/t/:slug`). Strictement **lecture seule** : planning, résultats et classement
 * en direct, destinés à la fois à un affichage TV/vidéoprojecteur et au mobile des
 * équipes. Le rafraîchissement se fait via SSE (aucune interaction requise).
 *
 * On n'expose que des données publiques (nom du tournoi, équipes, scores) — jamais
 * l'`id` de club, l'organisateur, etc.
 */
export default class PublicController {
  async show({ inertia, params }: HttpContext) {
    const tournament = await Tournament.query()
      .where('public_slug', params.slug)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    const { matches, standings, pools } = await buildResultsData(tournament)

    return inertia.render('public/tournament', {
      tournament: {
        name: tournament.name,
        category: tournament.category,
        eventDate: tournament.eventDate.toISODate(),
        status: tournament.status,
        publicSlug: tournament.publicSlug,
        format: tournament.format,
      },
      matches,
      standings,
      pools,
    })
  }
}
