import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { matchScoreValidator } from '#validators/match_score'
import { broadcastResults } from '#services/realtime'
import { buildResultsData } from '#services/tournament_results'

/**
 * Saisie des résultats le jour J + classement en direct (cf. CLAUDE.md §5, §8, §9).
 * Concurrence « dernier écrit gagne » : chaque enregistrement écrase le précédent
 * et trace qui a saisi (`updated_by_user_id`) et quand (`updated_at`).
 * Le classement n'est jamais stocké : recalculé à la volée par un service pur.
 * À chaque score, le nouvel état est poussé aux abonnés SSE (temps réel).
 */
export default class ResultsController {
  /** Requête scopée au club de l'organisateur connecté (cf. CLAUDE.md §9). */
  private scoped(auth: HttpContext['auth']) {
    return Tournament.query().where('club_id', auth.user!.clubId)
  }

  /** Grille de saisie + classement calculé à la volée. */
  async index({ inertia, params, auth }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    const { matches, standings } = await buildResultsData(tournament)

    return inertia.render('tournaments/results', {
      tournament: tournament.serialize(),
      matches,
      standings,
    })
  }

  /** Enregistre (ou corrige) le score d'un match — « dernier écrit gagne ». */
  async update({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    const match = await Match.query()
      .where('tournament_id', tournament.id)
      .where('id', params.matchId)
      .firstOrFail()

    const { homeScore, awayScore } = await request.validateUsing(matchScoreValidator)

    match.merge({
      homeScore,
      awayScore,
      status: 'finished',
      updatedByUserId: auth.user!.id, // traçabilité : qui a saisi en dernier
    })
    await match.save()

    await this.syncTournamentStatus(tournament)

    // Diffusion temps réel : le nouvel état (scores + classement) part vers tous
    // les abonnés (autres organisateurs, futur écran public). Sans SSE, la saisie
    // reste fonctionnelle — l'organisateur qui saisit voit la maj via le rechargement
    // Inertia ci-dessous (dégradation gracieuse).
    const { matches, standings } = await buildResultsData(tournament)
    broadcastResults(tournament.publicSlug, {
      type: 'results:updated',
      matchId: match.id,
      matches,
      standings,
    })

    session.flash('success', 'Score enregistré.')
    return response.redirect().toRoute('tournaments.results', { id: tournament.id })
  }

  /**
   * Fait avancer le statut du tournoi selon l'avancement des scores :
   * un premier score → `live`, tous les matchs terminés → `finished`.
   * Ne redescend jamais en deçà de `scheduled`.
   */
  private async syncTournamentStatus(tournament: Tournament) {
    const total = await Match.query().where('tournament_id', tournament.id).count('* as total')
    const finished = await Match.query()
      .where('tournament_id', tournament.id)
      .where('status', 'finished')
      .count('* as total')

    const totalCount = Number(total[0].$extras.total)
    const finishedCount = Number(finished[0].$extras.total)

    let next = tournament.status
    if (totalCount > 0 && finishedCount === totalCount) {
      next = 'finished'
    } else if (finishedCount > 0) {
      next = 'live'
    }

    if (next !== tournament.status) {
      tournament.status = next
      await tournament.save()
    }
  }
}
