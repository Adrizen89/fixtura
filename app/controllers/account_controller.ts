import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { exportClubData, exportFileName } from '#services/club_data'
import { ClubPolicy } from '#policies/club_policy'
import { recordAudit, AUDIT_ACTIONS } from '#services/audit_log'

/**
 * Espace compte de l'organisateur connecté — actions RGPD en libre-service.
 *
 * Réservé au rôle `owner` (responsable du club, représentant du responsable de
 * traitement) : lui seul peut exporter l'ensemble des données du club. Les autres
 * organisateurs (`organizer`) reçoivent un 403.
 */
export default class AccountController {
  /**
   * Portabilité des données (RGPD art. 20) : télécharge l'intégralité des données
   * du club de l'organisateur connecté sous forme de fichier JSON. Toujours scopé
   * au `club_id` du compte — jamais un autre club.
   */
  async exportData({ auth, request, response }: HttpContext) {
    const user = auth.user!
    if (!ClubPolicy.exportData(user)) {
      return response.forbidden({ message: 'Réservé au responsable du club.' })
    }

    const generatedAt = DateTime.now().toISO()!
    const data = await exportClubData(user.clubId, generatedAt)
    await recordAudit(user, request.ip(), AUDIT_ACTIONS.CLUB_DATA_EXPORTED)
    const slug = String(data.club.slug ?? 'club')

    response.header('Content-Type', 'application/json; charset=utf-8')
    response.header(
      'Content-Disposition',
      `attachment; filename="${exportFileName(slug, generatedAt)}"`
    )
    // Empêche toute mise en cache d'un export de données personnelles.
    response.header('Cache-Control', 'no-store')
    return response.json(data)
  }
}
