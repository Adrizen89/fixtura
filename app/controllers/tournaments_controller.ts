import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Tournament from '#models/tournament'
import type { TournamentFormat, TournamentFormatConfig } from '#models/tournament'
import Match from '#models/match'
import { tournamentValidator } from '#validators/tournament'
import { generatePublicSlug } from '#services/public_slug'
import { viewFromMatches } from '#services/planning'

/** Config de format à stocker (`format_config`) selon le format choisi ; null en championnat. */
function formatConfigOf(data: {
  format: TournamentFormat
  numPools?: number | null
  qualifiersPerPool?: number | null
  thirdPlace?: boolean
}): TournamentFormatConfig | null {
  switch (data.format) {
    case 'pools':
      return { numPools: data.numPools ?? undefined }
    case 'knockout':
      return { thirdPlace: data.thirdPlace ?? false }
    case 'hybrid':
      return {
        numPools: data.numPools ?? undefined,
        qualifiersPerPool: data.qualifiersPerPool ?? undefined,
        thirdPlace: data.thirdPlace ?? false,
      }
    default:
      return null // championnat : aucun paramètre de format
  }
}

export default class TournamentsController {
  /**
   * Requête de base scopée au club de l'organisateur connecté, via le scope
   * réutilisable `Tournament.forClub` (scoping club_id systématique — cf. CLAUDE.md §9, §12).
   */
  private scoped(auth: HttpContext['auth']) {
    return Tournament.query().withScopes((scopes) => scopes.forClub(auth.user!.clubId))
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
    return inertia.render('tournaments/create', {})
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
      format: data.format,
      formatConfig: formatConfigOf(data),
    })

    session.flash('success', 'Tournoi créé.')
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Détail d'un tournoi (+ équipes + planning persisté le cas échéant). */
  async show({ inertia, params, auth }: HttpContext) {
    const tournament = await this.scoped(auth)
      .where('id', params.id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()

    const matches = await Match.query()
      .where('tournament_id', tournament.id)
      .preload('homeTeam')
      .preload('awayTeam')
      .orderBy('scheduled_at')
      .orderBy('terrain_number')

    const planning = matches.length ? viewFromMatches(matches, tournament.matchDurationMin) : null

    return inertia.render('tournaments/show', {
      tournament: tournament.serialize(),
      planning,
    })
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
      format: data.format,
      formatConfig: formatConfigOf(data),
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
