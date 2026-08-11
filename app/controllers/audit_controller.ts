import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { AuditPolicy } from '#policies/audit_policy'
import { deny } from '#policies/authorize'

/**
 * Journal d'audit du club (issue #117, cf. §10) — consultation en lecture seule,
 * réservée au responsable (`owner`). Scopé explicitement au `club_id` du compte
 * connecté (jamais un autre club). Trié du plus récent au plus ancien, paginé.
 */
export default class AuditController {
  async index({ inertia, auth, request, response, session }: HttpContext) {
    if (!AuditPolicy.view(auth.user!)) {
      return deny({ session, response })
    }

    const page = Number(request.input('page', 1)) || 1
    const entries = await AuditLog.query()
      .where('club_id', auth.user!.clubId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .paginate(page, 50)

    const { meta, data } = entries.serialize()

    return inertia.render('audit/index', {
      entries: data.map((e) => ({
        id: e.id,
        action: e.action,
        actorEmail: e.actorEmail,
        target: e.target,
        metadata: e.metadata,
        ip: e.ip,
        createdAt: e.createdAt,
      })),
      pagination: {
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
        total: meta.total,
      },
    })
  }
}
