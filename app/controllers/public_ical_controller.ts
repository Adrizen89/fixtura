import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Tournament from '#models/tournament'
import Match from '#models/match'
import { tournamentCalendar, buildIcalCalendar, icsFileName } from '#services/ical'

/**
 * Export iCalendar du planning d'un tournoi (issue #121) — **public, sans auth**,
 * via le `public_slug` non devinable (cf. CLAUDE.md §5, §10).
 *
 * La même URL sert de **fichier téléchargeable** ET d'**URL d'abonnement** : un
 * client agenda (Google/Apple/Outlook) qui s'abonne repolle l'URL et récupère le
 * planning à jour (décalages, scores). Aucune donnée privée (club, organisateur)
 * n'est exposée — uniquement le planning public.
 *
 * Contrôleur mince (§8) : la sérialisation iCal est déléguée au service pur `ical`.
 */
export default class PublicIcalController {
  async show({ params, request, response }: HttpContext) {
    const tournament = await Tournament.query().where('public_slug', params.slug).firstOrFail()

    const matches = await Match.query()
      .where('tournament_id', tournament.id)
      .preload('homeTeam')
      .preload('awayTeam')
      .orderBy('scheduled_at')
      .orderBy('terrain_number')

    const origin = `${request.protocol()}://${request.host()}`
    const ics = buildIcalCalendar(tournamentCalendar(tournament, matches, DateTime.utc(), origin))

    // `?download=1` force le téléchargement ; par défaut `inline` pour laisser les
    // clients d'abonnement consommer l'URL directement.
    const download = ['1', 'true'].includes(String(request.qs().download ?? ''))
    const disposition = download ? 'attachment' : 'inline'

    response.header('Content-Type', 'text/calendar; charset=utf-8')
    response.header('Content-Disposition', `${disposition}; filename="${icsFileName(tournament)}"`)
    // Données publiques qui évoluent : cache court, partageable par le proxy.
    response.header('Cache-Control', 'public, max-age=300')
    return response.send(ics)
  }
}
