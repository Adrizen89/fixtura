import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Team from '#models/team'
import { teamValidator } from '#validators/team'

/**
 * Gestion des équipes d'un tournoi (nom uniquement — cf. CLAUDE.md §3).
 * Ressource imbriquée sous `tournaments` : la gestion se fait depuis la page
 * du tournoi, il n'y a donc ni index/create/show/edit dédiés.
 */
export default class TeamsController {
  /**
   * Retrouve le tournoi parent — cloisonnement par club **automatique** (scope
   * global `TenantContext`, cf. issue #34) : 404 si hors club. `Team` n'a pas de
   * `club_id` ; le cloisonnement passe par ce tournoi parent, dont l'`id` sert
   * ensuite à filtrer les équipes.
   */
  private findTournament(tournamentId: number | string) {
    return Tournament.query().where('id', tournamentId).firstOrFail()
  }

  /** Retrouve une équipe rattachée au tournoi (404 sinon). */
  private findTeam(tournamentId: number, teamId: number | string) {
    return Team.query().where('tournament_id', tournamentId).where('id', teamId).firstOrFail()
  }

  /** Ajoute une équipe au tournoi. */
  async store({ request, response, params, session, i18n }: HttpContext) {
    const tournament = await this.findTournament(params.tournament_id)

    const { name } = await request.validateUsing(teamValidator, {
      meta: { tournamentId: tournament.id },
    })

    await Team.create({ tournamentId: tournament.id, name })

    session.flash('success', i18n.t('messages.flash.admin.teamAdded', { name }))
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Renomme une équipe. */
  async update({ request, response, params, session, i18n }: HttpContext) {
    const tournament = await this.findTournament(params.tournament_id)
    const team = await this.findTeam(tournament.id, params.id)

    const { name } = await request.validateUsing(teamValidator, {
      meta: { tournamentId: tournament.id, teamId: team.id },
    })

    team.name = name
    await team.save()

    session.flash('success', i18n.t('messages.flash.admin.teamRenamed'))
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Supprime une équipe. */
  async destroy({ response, params, session, i18n }: HttpContext) {
    const tournament = await this.findTournament(params.tournament_id)
    const team = await this.findTeam(tournament.id, params.id)

    const removed = team.name
    await team.delete()

    session.flash('success', i18n.t('messages.flash.admin.teamDeleted', { name: removed }))
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
