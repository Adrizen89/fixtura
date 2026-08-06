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
   * Retrouve le tournoi parent, scopé au club via le scope réutilisable
   * `Tournament.forClub` (scoping `club_id` systématique — cf. CLAUDE.md §9, §12).
   * 404 si hors club. `Team` n'a pas de `club_id` : le cloisonnement passe par ce
   * tournoi parent, dont l'`id` sert ensuite à filtrer les équipes.
   */
  private findTournament(auth: HttpContext['auth'], tournamentId: number | string) {
    return Tournament.query()
      .withScopes((scopes) => scopes.forClub(auth.user!.clubId))
      .where('id', tournamentId)
      .firstOrFail()
  }

  /** Retrouve une équipe rattachée au tournoi (404 sinon). */
  private findTeam(tournamentId: number, teamId: number | string) {
    return Team.query().where('tournament_id', tournamentId).where('id', teamId).firstOrFail()
  }

  /** Ajoute une équipe au tournoi. */
  async store({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.tournament_id)

    const { name } = await request.validateUsing(teamValidator, {
      meta: { tournamentId: tournament.id },
    })

    await Team.create({ tournamentId: tournament.id, name })

    session.flash('success', `Équipe « ${name} » ajoutée.`)
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Renomme une équipe. */
  async update({ request, response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.tournament_id)
    const team = await this.findTeam(tournament.id, params.id)

    const { name } = await request.validateUsing(teamValidator, {
      meta: { tournamentId: tournament.id, teamId: team.id },
    })

    team.name = name
    await team.save()

    session.flash('success', 'Équipe renommée.')
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }

  /** Supprime une équipe. */
  async destroy({ response, params, auth, session }: HttpContext) {
    const tournament = await this.findTournament(auth, params.tournament_id)
    const team = await this.findTeam(tournament.id, params.id)

    await team.delete()

    session.flash('success', `Équipe « ${team.name} » supprimée.`)
    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
