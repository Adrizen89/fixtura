import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Event from '#models/event'
import Tournament from '#models/tournament'
import type { TournamentFormatConfig } from '#models/tournament'
import { eventValidator, eventCategoryValidator } from '#validators/event'
import { generatePublicSlug } from '#services/public_slug'
import { buildPersistedEventPlanning } from '#services/event_planning'
import { EventPolicy } from '#policies/event_policy'
import { deny } from '#policies/authorize'

/**
 * Événements multi-catégories (#32) — CRUD + gestion des catégories.
 *
 * Un événement regroupe plusieurs tournois (catégories) partageant un pool de
 * terrains et le rythme de la journée. Le cloisonnement par club est automatique
 * (scope global `TenantContext` — issue #34, cf. CLAUDE.md §9, §12).
 */
export default class EventsController {
  /**
   * Requête de base sur les événements. Cloisonnement par club **automatique**
   * (scope global `TenantContext`, cf. issue #34) : plus de `forClub` manuel ; un
   * événement d'un autre club est invisible (liste filtrée, `firstOrFail` → 404).
   */
  private query() {
    return Event.query()
  }

  /** Tableau de bord des événements du club. */
  async index({ inertia }: HttpContext) {
    const events = await this.query()
      .withCount('tournaments')
      .orderBy('event_date', 'desc')
      .orderBy('created_at', 'desc')

    return inertia.render('events/index', {
      events: events.map((e) => ({
        ...e.serialize(),
        categoriesCount: Number(e.$extras.tournaments_count ?? 0),
      })),
    })
  }

  /** Formulaire de création. */
  async create({ inertia }: HttpContext) {
    return inertia.render('events/create', {})
  }

  /** Persiste un nouvel événement. */
  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(eventValidator)

    const event = await Event.create({
      clubId: auth.user!.clubId,
      name: data.name,
      eventDate: DateTime.fromISO(data.eventDate),
      startTime: data.startTime,
      matchDurationMin: data.matchDurationMin,
      breakDurationMin: data.breakDurationMin,
      lunchStart: data.lunchStart ?? null,
      lunchDurationMin: data.lunchDurationMin,
      numTerrains: data.numTerrains,
      status: 'draft',
      publicSlug: generatePublicSlug(data.name),
    })

    session.flash('success', 'Événement créé. Ajoutez maintenant vos catégories.')
    return response.redirect().toRoute('events.show', { id: event.id })
  }

  /** Détail d'un événement : paramètres, catégories, planning combiné persisté. */
  async show({ inertia, params }: HttpContext) {
    const event = await this.query().where('id', params.id).firstOrFail()

    const categories = await Tournament.query()
      .where('event_id', event.id)
      .withCount('teams')
      .orderBy('created_at', 'asc')

    const planning = await buildPersistedEventPlanning(event, categories)

    return inertia.render('events/show', {
      event: event.serialize(),
      categories: categories.map((c) => ({
        ...c.serialize(),
        teamsCount: Number(c.$extras.teams_count ?? 0),
      })),
      planning,
    })
  }

  /** Formulaire d'édition. */
  async edit({ inertia, params }: HttpContext) {
    const event = await this.query().where('id', params.id).firstOrFail()
    return inertia.render('events/edit', { event: event.serialize() })
  }

  /** Met à jour un événement. */
  async update({ request, response, params, session }: HttpContext) {
    const event = await this.query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(eventValidator)

    event.merge({
      name: data.name,
      eventDate: DateTime.fromISO(data.eventDate),
      startTime: data.startTime,
      matchDurationMin: data.matchDurationMin,
      breakDurationMin: data.breakDurationMin,
      lunchStart: data.lunchStart ?? null,
      lunchDurationMin: data.lunchDurationMin,
      numTerrains: data.numTerrains,
    })
    await event.save()

    session.flash('success', 'Événement mis à jour.')
    return response.redirect().toRoute('events.show', { id: event.id })
  }

  /**
   * Supprime un événement (ses catégories sont détachées, jamais supprimées).
   * Réservé au responsable du club (owner).
   */
  async destroy({ response, params, auth, session }: HttpContext) {
    if (!EventPolicy.delete(auth.user!)) {
      return deny({ session, response })
    }

    const event = await this.query().where('id', params.id).firstOrFail()
    await event.delete()

    session.flash('success', 'Événement supprimé. Les catégories restent accessibles en tournois.')
    return response.redirect().toRoute('events.index')
  }

  /**
   * Ajoute une catégorie (= un tournoi) à l'événement. La catégorie hérite des
   * paramètres horaires + pool de terrains de l'événement (copiés pour rester
   * compatibles avec les écrans de tournoi existants ; la génération du planning de
   * l'événement fait autorité sur la grille partagée).
   */
  async storeCategory({ request, response, params, session }: HttpContext) {
    const event = await this.query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(eventCategoryValidator)

    let formatConfig: TournamentFormatConfig | null = null
    if (data.format === 'pools') {
      formatConfig = { numPools: data.numPools ?? undefined }
    } else if (data.format === 'knockout') {
      formatConfig = { thirdPlace: data.thirdPlace ?? false }
    }

    await Tournament.create({
      clubId: event.clubId,
      eventId: event.id,
      name: data.name,
      category: data.category,
      eventDate: event.eventDate,
      startTime: event.startTime,
      matchDurationMin: event.matchDurationMin,
      breakDurationMin: event.breakDurationMin,
      lunchStart: event.lunchStart,
      lunchDurationMin: event.lunchDurationMin,
      numTerrains: event.numTerrains,
      status: 'draft',
      publicSlug: generatePublicSlug(`${event.name} ${data.category}`),
      format: data.format,
      formatConfig,
    })

    session.flash('success', 'Catégorie ajoutée.')
    return response.redirect().toRoute('events.show', { id: event.id })
  }

  /**
   * Détache et supprime une catégorie de l'événement (cascade équipes + matchs).
   * Réservé au responsable du club (owner).
   */
  async destroyCategory({ response, params, auth, session }: HttpContext) {
    if (!EventPolicy.deleteCategory(auth.user!)) {
      return deny({ session, response })
    }

    const event = await this.query().where('id', params.id).firstOrFail()
    const category = await Tournament.query()
      .where('id', params.categoryId)
      .where('event_id', event.id)
      .firstOrFail()
    await category.delete()

    session.flash('success', 'Catégorie supprimée.')
    return response.redirect().toRoute('events.show', { id: event.id })
  }
}
