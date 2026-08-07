import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { SchedulerError } from '#services/scheduler/index'
import {
  generateFor,
  persistSchedule,
  viewFromSchedule,
  generatePhasedFor,
  persistPhasedSchedule,
  viewFromPhased,
} from '#services/planning'

/**
 * Génération du planning d'un tournoi (cf. CLAUDE.md §6).
 * Flux : « Générer » → aperçu (GET, sans persister) → « Valider » (POST, persiste).
 * La régénération réutilise le même flux et remplace le planning existant.
 */
export default class PlanningController {
  /** Cloisonnement par club **automatique** (scope global `TenantContext`, issue #34) : 404 hors club. */
  private query() {
    return Tournament.query()
  }

  /** Aperçu du planning (sans persistance). */
  async preview({ inertia, response, params, session }: HttpContext) {
    const tournament = await this.query()
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    if (tournament.teams.length < 2) {
      session.flash('error', 'Il faut au moins 2 équipes pour générer un planning.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    try {
      const names = new Map(tournament.teams.map((t) => [t.id, t.name]))
      const hasExistingPlanning = await Match.query().where('tournament_id', tournament.id).first()

      // Championnat : chemin v1 intact. Autres formats (poules / élimination /
      // hybride) : planning multi-phases (participants éventuellement différés).
      const preview =
        tournament.format === 'championship'
          ? viewFromSchedule(generateFor(tournament), names)
          : viewFromPhased(generatePhasedFor(tournament), names)

      return inertia.render('tournaments/planning', {
        tournament: tournament.serialize(),
        preview,
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
  async store({ response, params, session }: HttpContext) {
    const tournament = await this.query()
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    if (tournament.teams.length < 2) {
      session.flash('error', 'Il faut au moins 2 équipes pour générer un planning.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    try {
      if (tournament.format === 'championship') {
        await persistSchedule(tournament, generateFor(tournament))
      } else {
        await persistPhasedSchedule(tournament, generatePhasedFor(tournament))
      }
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
