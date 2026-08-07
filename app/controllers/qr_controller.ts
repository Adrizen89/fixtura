import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import { publicTournamentUrl, qrSvg } from '#services/qr_code'

/**
 * QR code (SVG) pointant vers l'écran public d'un tournoi (issue #40).
 *
 * Réservé à l'admin (organisateur authentifié), scopé au club via `Tournament.forClub`
 * (cf. CLAUDE.md §9, §12) : on ne génère un QR que pour un tournoi de son club. Le SVG
 * est mis en cache (le `public_slug` ne change pas) et peut être ouvert / imprimé pour
 * l'affichage au bord des terrains.
 */
export default class QrController {
  async tournament({ request, response, params, auth }: HttpContext) {
    const tournament = await Tournament.query()
      .withScopes((scopes) => scopes.forClub(auth.user!.clubId))
      .where('id', params.id)
      .firstOrFail()

    const origin = `${request.protocol()}://${request.host()}`
    const svg = qrSvg(publicTournamentUrl(origin, tournament.publicSlug))

    response.header('Content-Type', 'image/svg+xml; charset=utf-8')
    response.header('Cache-Control', 'private, max-age=3600')
    return response.send(svg)
  }
}
