import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { matchScoreValidator } from '#validators/match_score'
import { matchScheduleValidator, matchForfeitValidator } from '#validators/match_incident'
import { scoreFields, forfeitFields, timeToMinutes } from '#services/match_incidents'
import { broadcastResults } from '#services/realtime'
import { buildResultsData } from '#services/tournament_results'

/**
 * Saisie des résultats le jour J + classement en direct + gestion des aléas
 * (cf. CLAUDE.md §5, §8, §9 · issues #4 et #6).
 *
 * Trois mutations « jour J » sur un match, toutes historisées (`updated_by_user_id`,
 * `updated_at`) et diffusées en temps réel (SSE) aux organisateurs et à l'écran public :
 *   - `update`     : saisir / corriger un score (« dernier écrit gagne », à tout moment) ;
 *   - `reschedule` : décaler un match (nouvelle heure, éventuellement terrain) ;
 *   - `forfeit`    : déclarer un forfait — *statut* de match, jamais une suppression.
 *
 * Le classement n'est jamais stocké : recalculé à la volée par un service pur.
 */
export default class ResultsController {
  /** Requête scopée au club via le scope réutilisable `Tournament.forClub` (cf. CLAUDE.md §9, §12). */
  private scoped(auth: HttpContext['auth']) {
    return Tournament.query().withScopes((scopes) => scopes.forClub(auth.user!.clubId))
  }

  /** Tournoi du club (équipes préchargées, requises pour le classement). 404 hors club. */
  private findTournament(auth: HttpContext['auth'], id: number | string) {
    return this.scoped(auth)
      .where('id', id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()
  }

  /** Match rattaché au tournoi (404 sinon), avec ses deux équipes préchargées. */
  private findMatch(tournament: Tournament, matchId: number | string) {
    return Match.query()
      .where('tournament_id', tournament.id)
      .where('id', matchId)
      .preload('homeTeam')
      .preload('awayTeam')
      .firstOrFail()
  }

  /**
   * Diffuse le nouvel état (scores + classement recalculé) à tous les abonnés SSE.
   * Sans SSE, la saisie reste fonctionnelle : l'organisateur voit la maj via le
   * rechargement Inertia (dégradation gracieuse — cf. CLAUDE.md §9).
   */
  private async pushLiveState(tournament: Tournament, matchId: number) {
    const { matches, standings } = await buildResultsData(tournament)
    broadcastResults(tournament.publicSlug, {
      type: 'results:updated',
      matchId,
      matches,
      standings,
    })
  }

  /** Grille de saisie + classement calculé à la volée. */
  async index({ inertia, params, auth }: HttpContext) {
    const tournament = await this.findTournament(auth, params.id)
    const { matches, standings } = await buildResultsData(tournament)

    return inertia.render('tournaments/results', {
      tournament: tournament.serialize(),
      matches,
      standings,
    })
  }

  /**
   * Enregistre (ou corrige) le score d'un match — « dernier écrit gagne », à tout
   * moment. Un score réel termine le match et annule un éventuel forfait antérieur.
   */
  async update({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.id)
    const match = await this.findMatch(tournament, params.matchId)

    const { homeScore, awayScore } = await request.validateUsing(matchScoreValidator)

    match.merge({
      ...scoreFields(homeScore, awayScore),
      updatedByUserId: auth.user!.id, // traçabilité : qui a saisi en dernier
    })
    await match.save()

    await this.syncTournamentStatus(tournament)
    await this.pushLiveState(tournament, match.id)

    session.flash('success', 'Score enregistré.')
    return response.redirect().toRoute('tournaments.results', { id: tournament.id })
  }

  /**
   * Décale un match : nouvelle heure murale (obligatoire) et, éventuellement, un
   * autre terrain. `scheduled_at` est reconstruit en UTC à partir de la date de
   * l'événement pour que l'heure affichée reste stable (même logique que la
   * persistance du planning). Ne touche ni au score ni au statut.
   */
  async reschedule({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.id)
    const match = await this.findMatch(tournament, params.matchId)

    const { time, terrainNumber } = await request.validateUsing(matchScheduleValidator)

    if (terrainNumber !== undefined && terrainNumber > tournament.numTerrains) {
      session.flash('error', `Ce tournoi n'a que ${tournament.numTerrains} terrain(s).`)
      return response.redirect().toRoute('tournaments.results', { id: tournament.id })
    }

    const { year, month, day } = tournament.eventDate
    const eventDay = DateTime.utc(year, month, day)

    match.merge({
      scheduledAt: eventDay.plus({ minutes: timeToMinutes(time) }),
      terrainNumber: terrainNumber ?? match.terrainNumber,
      updatedByUserId: auth.user!.id,
    })
    await match.save()

    await this.pushLiveState(tournament, match.id)

    session.flash('success', `Match décalé à ${time}.`)
    return response.redirect().toRoute('tournaments.results', { id: tournament.id })
  }

  /**
   * Déclare un forfait pour le côté désigné (domicile / extérieur). Le forfait est
   * un statut de match (pas une suppression) : le score réglementaire est matérialisé
   * (3–0 pour l'adversaire — cf. CLAUDE.md §9) afin d'impacter le classement comme une
   * victoire normale. Reste corrigeable ensuite via la saisie d'un score réel.
   */
  async forfeit({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.id)
    const match = await this.findMatch(tournament, params.matchId)

    const { side } = await request.validateUsing(matchForfeitValidator)

    match.merge({
      ...forfeitFields(side, match.homeTeamId, match.awayTeamId),
      updatedByUserId: auth.user!.id,
    })
    await match.save()

    await this.syncTournamentStatus(tournament)
    await this.pushLiveState(tournament, match.id)

    const forfeited = side === 'home' ? match.homeTeam.name : match.awayTeam.name
    session.flash('success', `Forfait de « ${forfeited} » enregistré (défaite 3–0).`)
    return response.redirect().toRoute('tournaments.results', { id: tournament.id })
  }

  /**
   * Fait avancer le statut du tournoi selon l'avancement des matchs réglés
   * (score saisi **ou** forfait) : un premier match réglé → `live`, tous réglés →
   * `finished`. Ne redescend jamais en deçà de `scheduled`.
   */
  private async syncTournamentStatus(tournament: Tournament) {
    const total = await Match.query().where('tournament_id', tournament.id).count('* as total')
    const settled = await Match.query()
      .where('tournament_id', tournament.id)
      .whereIn('status', ['finished', 'forfeit'])
      .count('* as total')

    const totalCount = Number(total[0].$extras.total)
    const settledCount = Number(settled[0].$extras.total)

    let next = tournament.status
    if (totalCount > 0 && settledCount === totalCount) {
      next = 'finished'
    } else if (settledCount > 0) {
      next = 'live'
    }

    if (next !== tournament.status) {
      tournament.status = next
      await tournament.save()
    }
  }
}
