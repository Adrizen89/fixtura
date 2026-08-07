import type { HttpContext } from '@adonisjs/core/http'
import Event from '#models/event'
import Tournament from '#models/tournament'
import { SchedulerError } from '#services/scheduler/index'
import {
  generateEventSchedule,
  persistEventSchedule,
  viewFromEventSchedule,
} from '#services/event_planning'

/**
 * Génération du planning **combiné** d'un événement multi-catégories (#32).
 * Flux identique au planning mono-tournoi : « Générer » → aperçu (GET, sans
 * persister) → « Valider » (POST, persiste). Le placement se fait sur le pool de
 * terrains partagé de l'événement, sans collision de créneau entre catégories.
 */
export default class EventPlanningController {
  /**
   * Événement + ses catégories (équipes préchargées, requises pour la génération).
   * Cloisonnement par club **automatique** (scope global `TenantContext`, issue #34) :
   * 404 hors club, sans `forClub` explicite.
   */
  private async load(id: number | string) {
    const event = await Event.query().where('id', id).firstOrFail()
    const categories = await Tournament.query()
      .where('event_id', event.id)
      .preload('teams', (q) => q.orderBy('name'))
      .orderBy('created_at', 'asc')
    return { event, categories }
  }

  /** Aperçu du planning combiné (sans persistance). */
  async preview({ inertia, response, params, session }: HttpContext) {
    const { event, categories } = await this.load(params.id)

    if (categories.length === 0) {
      session.flash('error', 'Ajoutez au moins une catégorie avant de générer le planning.')
      return response.redirect().toRoute('events.show', { id: event.id })
    }

    try {
      const schedule = generateEventSchedule(event, categories)
      const preview = viewFromEventSchedule(event, categories, schedule)
      const hasExistingPlanning = schedule.matches.length > 0 && event.status !== 'draft'

      return inertia.render('events/planning', {
        event: event.serialize(),
        preview,
        hasExistingPlanning,
      })
    } catch (error) {
      if (error instanceof SchedulerError) {
        session.flash('error', error.message)
        return response.redirect().toRoute('events.show', { id: event.id })
      }
      throw error
    }
  }

  /** Valide l'aperçu : génère puis persiste le planning combiné (draft → scheduled). */
  async store({ response, params, session }: HttpContext) {
    const { event, categories } = await this.load(params.id)

    if (categories.length === 0) {
      session.flash('error', 'Ajoutez au moins une catégorie avant de générer le planning.')
      return response.redirect().toRoute('events.show', { id: event.id })
    }

    try {
      const schedule = generateEventSchedule(event, categories)
      await persistEventSchedule(event, categories, schedule)
      session.flash('success', 'Planning de l’événement généré et enregistré.')
    } catch (error) {
      if (error instanceof SchedulerError) {
        session.flash('error', error.message)
      } else {
        throw error
      }
    }

    return response.redirect().toRoute('events.show', { id: event.id })
  }
}
