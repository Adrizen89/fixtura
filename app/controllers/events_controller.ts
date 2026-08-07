import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Event from '#models/event'
import Tournament from '#models/tournament'
import type { TournamentFormatConfig } from '#models/tournament'
import { eventValidator, eventCategoryValidator } from '#validators/event'
import { generatePublicSlug } from '#services/public_slug'
import { buildPersistedEventPlanning } from '#services/event_planning'

/**
 * Événements multi-catégories (#32) — CRUD + gestion des catégories.
 *
 * Un événement regroupe plusieurs tournois (catégories) partageant un pool de
 * terrains et le rythme de la journée. Le cloisonnement par club passe par le scope
 * réutilisable `Event.forClub` (aligné sur `Tournament.forClub` — cf. CLAUDE.md §9, §12).
 */
export default class EventsController {
  /** Requête événements scopée au club de l'organisateur connecté. */
  private scoped(auth: HttpContext['auth']) {
    return Event.query().withScopes((scopes) => scopes.forClub(auth.user!.clubId))
  }

  /** Tableau de bord des événements du club. */
  async index({ inertia, auth }: HttpContext) {
    const events = await this.scoped(auth)
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
  async show({ inertia, params, auth }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()

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
  async edit({ inertia, params, auth }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()
    return inertia.render('events/edit', { event: event.serialize() })
  }

  /** Met à jour un événement. */
  async update({ request, response, params, auth, session }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()
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

  /** Supprime un événement (ses catégories sont détachées, jamais supprimées). */
  async destroy({ response, params, auth, session }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()
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
  async storeCategory({ request, response, params, auth, session }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()
    const data = await request.validateUsing(eventCategoryValidator)

    const formatConfig: TournamentFormatConfig | null =
      data.format === 'pools' ? { numPools: data.numPools ?? undefined } : null

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

  /** Détache et supprime une catégorie de l'événement (cascade équipes + matchs). */
  async destroyCategory({ response, params, auth, session }: HttpContext) {
    const event = await this.scoped(auth).where('id', params.id).firstOrFail()
    const category = await Tournament.query()
      .where('id', params.categoryId)
      .where('event_id', event.id)
      .firstOrFail()
    await category.delete()

    session.flash('success', 'Catégorie supprimée.')
    return response.redirect().toRoute('events.show', { id: event.id })
  }
}
