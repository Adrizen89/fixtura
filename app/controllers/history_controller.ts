import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Event from '#models/event'

/**
 * Historique du club (issue #108, sous-issue de #98) — vue « archives ».
 *
 * Liste en **lecture seule** les éditions **terminées** (`status = 'finished'`) :
 * les événements multi-catégories et les tournois **autonomes** (sans événement de
 * rattachement — les catégories d'un événement sont consultées via leur événement,
 * jamais listées à part). Le cloisonnement par club est **automatique** (scope
 * global `TenantContext` — cf. issue #34) : un historique d'un autre club est
 * invisible.
 *
 * La consultation figée d'une édition passée (planning + résultats + classement
 * final) réutilise l'écran **public** en lecture seule (`/t/:slug`, `/e/:slug`) :
 * une édition `finished` n'évolue plus, l'écran est donc naturellement gelé. On ne
 * duplique pas le rendu, et on garantit que l'archive montre exactement ce que les
 * équipes ont vu le jour J.
 */
export default class HistoryController {
  /** Archives du club : événements et tournois autonomes terminés, du plus récent. */
  async index({ inertia }: HttpContext) {
    const tournaments = await Tournament.query()
      .where('status', 'finished')
      .whereNull('event_id')
      .withCount('teams')
      .orderBy('event_date', 'desc')
      .orderBy('created_at', 'desc')

    const events = await Event.query()
      .where('status', 'finished')
      .withCount('tournaments')
      .orderBy('event_date', 'desc')
      .orderBy('created_at', 'desc')

    return inertia.render('history/index', {
      tournaments: tournaments.map((t) => ({
        ...t.serialize(),
        teamsCount: Number(t.$extras.teams_count ?? 0),
      })),
      events: events.map((e) => ({
        ...e.serialize(),
        categoriesCount: Number(e.$extras.tournaments_count ?? 0),
      })),
    })
  }
}
