import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { SchedulerError } from '#services/scheduler/index'
import { generateFor, persistSchedule, viewFromSchedule } from '#services/planning'

/**
 * Génération du planning d'un tournoi (cf. CLAUDE.md §6).
 * Flux : « Générer » → aperçu (GET, sans persister) → « Valider » (POST, persiste).
 * La régénération réutilise le même flux et remplace le planning existant.
 */
export default class PlanningController {
  /** Requête scopée au club de l'organisateur connecté (cf. CLAUDE.md §9). */
  private scoped(auth: HttpContext['auth']) {
    return Tournament.query().where('club_id', auth.user!.clubId)
  }

  /** Aperçu du planning (sans persistance). */
  async preview({ inertia, response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    if (tournament.teams.length < 2) {
      session.flash('error', 'Il faut au moins 2 équipes pour générer un planning.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    try {
      const schedule = generateFor(tournament)
      const names = new Map(tournament.teams.map((t) => [t.id, t.name]))
      const hasExistingPlanning = await Match.query().where('tournament_id', tournament.id).first()

      return inertia.render('tournaments/planning', {
        tournament: tournament.serialize(),
        preview: viewFromSchedule(schedule, names),
        hasExistingPlanning: hasExistingPlanning !== null,
      })
    } catch (error) {
      if (error instanceof SchedulerError) {
        session.flash('error', error.message)
        return response.redirect().toRoute('tournaments.show', { id: tournament.id })
      }
      throw error
    }
  }

  /** Valide l'aperçu : génère puis persiste le planning (draft → scheduled). */
  async store({ response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    if (tournament.teams.length < 2) {
      session.flash('error', 'Il faut au moins 2 équipes pour générer un planning.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    try {
      const schedule = generateFor(tournament)
      await persistSchedule(tournament, schedule)
      session.flash('success', 'Planning généré et enregistré.')
    } catch (error) {
      if (error instanceof SchedulerError) {
        session.flash('error', error.message)
      } else {
        throw error
      }
    }

    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
