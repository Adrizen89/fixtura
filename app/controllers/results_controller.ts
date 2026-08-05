import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { matchScoreValidator } from '#validators/match_score'
import { computeStandings } from '#services/standings'

/**
 * Saisie des résultats le jour J + classement en direct (cf. CLAUDE.md §5, §8).
 * Concurrence « dernier écrit gagne » : chaque enregistrement écrase le précédent
 * et trace qui a saisi (`updated_by_user_id`) et quand (`updated_at`).
 * Le classement n'est jamais stocké : recalculé à la volée par un service pur.
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

    const matches = await Match.query()
      .where('tournament_id', tournament.id)
      .preload('homeTeam')
      .preload('awayTeam')
      .preload('updatedByUser')
      .orderBy('scheduled_at')
      .orderBy('terrain_number')

    const rows = matches.map((m) => ({
      id: m.id,
      time: m.scheduledAt.toUTC().toFormat('HH:mm'),
      terrainNumber: m.terrainNumber,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      updatedBy: m.updatedByUser ? (m.updatedByUser.fullName ?? m.updatedByUser.email) : null,
      updatedAt: m.status === 'finished' && m.updatedAt ? m.updatedAt.toISO() : null,
    }))

    const standings = computeStandings(
      tournament.teams.map((t) => ({ id: t.id, name: t.name })),
      matches
        .filter((m) => m.homeScore !== null && m.awayScore !== null)
        .map((m) => ({
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeScore: m.homeScore!,
          awayScore: m.awayScore!,
        }))
    )

    return inertia.render('tournaments/results', {
      tournament: tournament.serialize(),
      matches: rows,
      standings,
    })
  }

  /** Enregistre (ou corrige) le score d'un match — « dernier écrit gagne ». */
  async update({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth).where('id', params.id).firstOrFail()

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
