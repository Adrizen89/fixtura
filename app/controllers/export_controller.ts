import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import Match from '#models/match'
import {
  buildPlanningExport,
  buildMatchSheetsExport,
  buildStandingsExport,
} from '#services/tournament_export'

/**
 * Export / impression PDF d'un tournoi (cf. CLAUDE.md §5, §9 · issue #38).
 *
 * Indispensable le jour J : imprimer le planning, distribuer les feuilles de match
 * aux terrains, afficher le classement final. Chaque action rend un document Edge
 * **autonome** pensé pour l'impression noir & blanc ; l'export PDF se fait via
 * l'impression native du navigateur (« Enregistrer en PDF »), sans dépendance PDF
 * côté serveur (§13 : pas de lib lourde).
 *
 * Contrôleur mince (§8) : toute la mise en forme est déléguée au service
 * `tournament_export`. Cloisonnement par club automatique (scope global
 * `TenantContext` — issue #34, cf. §9, §12).
 */
export default class ExportController {
  /**
   * Tournoi du club (équipes préchargées, requises pour le classement). Le
   * cloisonnement par club est **automatique** (scope global `TenantContext`,
   * cf. issue #34) : 404 hors club, sans `forClub` explicite.
   */
  private findTournament(id: number | string) {
    return Tournament.query()
      .where('id', id)
      .preload('teams', (q) => q.orderBy('name'))
      .firstOrFail()
  }

  /** Matchs du tournoi, dans l'ordre du planning, équipes préchargées. */
  private matchesOf(tournament: Tournament) {
    return Match.query()
      .where('tournament_id', tournament.id)
      .preload('homeTeam')
      .preload('awayTeam')
      .orderBy('scheduled_at')
      .orderBy('terrain_number')
  }

  /** Lien retour vers la fiche du tournoi (barre d'actions à l'écran). */
  private backHref(tournament: Tournament) {
    return `/tournaments/${tournament.id}`
  }

  /** Planning imprimable (grille créneaux × terrains). */
  async planning({ view, params, response, session }: HttpContext) {
    const tournament = await this.findTournament(params.id)
    const matches = await this.matchesOf(tournament)

    if (matches.length === 0) {
      session.flash('error', 'Générez d’abord le planning pour l’exporter.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    return view.render('exports/planning', {
      title: `Planning — ${tournament.name}`,
      backHref: this.backHref(tournament),
      ...buildPlanningExport(tournament, matches),
    })
  }

  /** Feuilles de match imprimables (une par match, score à remplir). */
  async matchSheets({ view, params, response, session }: HttpContext) {
    const tournament = await this.findTournament(params.id)
    const matches = await this.matchesOf(tournament)

    if (matches.length === 0) {
      session.flash('error', 'Générez d’abord le planning pour imprimer les feuilles de match.')
      return response.redirect().toRoute('tournaments.show', { id: tournament.id })
    }

    return view.render('exports/match_sheets', {
      title: `Feuilles de match — ${tournament.name}`,
      backHref: this.backHref(tournament),
      ...buildMatchSheetsExport(tournament, matches),
    })
  }

  /** Classement final imprimable (global ou par poule selon le format). */
  async standings({ view, params }: HttpContext) {
    const tournament = await this.findTournament(params.id)

    return view.render('exports/standings', {
      title: `Classement — ${tournament.name}`,
      backHref: this.backHref(tournament),
      ...(await buildStandingsExport(tournament)),
    })
  }
}
