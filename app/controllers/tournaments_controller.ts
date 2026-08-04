import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Tournament from '#models/tournament'
import { tournamentValidator } from '#validators/tournament'
import { generatePublicSlug } from '#services/public_slug'

export default class TournamentsController {
  /**
   * Requête de base scopée au club de l'organisateur connecté.
   * (Scoping club_id systématique — cf. CLAUDE.md §9.)
   */
  private scoped(auth: HttpContext['auth']) {
    return Tournament.query().where('club_id', auth.user!.clubId)
  }

  /** Tableau de bord des tournois du club. */
  async index({ inertia, auth }: HttpContext) {
    const tournaments = await this.scoped(auth)
      .withCount('teams')
      .orderBy('event_date', 'desc')
      .orderBy('created_at', 'desc')

    return inertia.render('tournaments/index', {
      tournaments: tournaments.map((t) => ({
        ...t.serialize(),
        teamsCount: Number(t.$extras.teams_count ?? 0),
      })),
    })
  }

  /** Formulaire de création. */
  async create({ inertia }: HttpContext) {
    return inertia.render('tournaments/create')
  }

  /** Persiste un nouveau tournoi. */
  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(tournamentValidator)

    const tournament = await Tournament.create({
      clubId: auth.user!.clubId,
      name: data.name,
      category: data.category,
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

    session.flash('success', 'Tournoi créé.')
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Détail d'un tournoi (+ équipes). */
  async show({ inertia, params, auth }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    return inertia.render('tournaments/show', { tournament: tournament.serialize() })
  }

  /** Formulaire d'édition. */
  async edit({ inertia, params, auth }: HttpContext) {
    const tournament = await this.scoped(auth).where('id', params.id).firstOrFail()
    return inertia.render('tournaments/edit', { tournament: tournament.serialize() })
  }

  /** Met à jour un tournoi. */
  async update({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth).where('id', params.id).firstOrFail()
    const data = await request.validateUsing(tournamentValidator)

    tournament.merge({
      name: data.name,
      category: data.category,
      eventDate: DateTime.fromISO(data.eventDate),
      startTime: data.startTime,
      matchDurationMin: data.matchDurationMin,
      breakDurationMin: data.breakDurationMin,
      lunchStart: data.lunchStart ?? null,
      lunchDurationMin: data.lunchDurationMin,
      numTerrains: data.numTerrains,
    })
    await tournament.save()

    session.flash('success', 'Tournoi mis à jour.')
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Supprime un tournoi (cascade équipes + matchs). */
  async destroy({ response, params, auth, session }: HttpContext) {
    const tournament = await this.scoped(auth).where('id', params.id).firstOrFail()
    await tournament.delete()

    session.flash('success', 'Tournoi supprimé.')
    return response.redirect().toRoute('tournaments.index')
  }
}
