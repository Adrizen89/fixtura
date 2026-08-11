import logger from '@adonisjs/core/services/logger'
import AuditLog from '#models/audit_log'
import type User from '#models/user'

/**
 * Journal d'audit des actions sensibles (issue #117, cf. §10) — logique isolée
 * hors des contrôleurs. `recordAudit` écrit une entrée à partir de l'utilisateur
 * connecté ; **best-effort** : un échec d'écriture du journal ne doit jamais casser
 * l'action métier (il est seulement journalisé côté serveur).
 */

/** Codes d'actions tracées. */
export const AUDIT_ACTIONS = {
  LOGIN: 'auth.login',
  MEMBER_INVITED: 'member.invited',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',
  INVITATION_REVOKED: 'invitation.revoked',
  TOURNAMENT_DELETED: 'tournament.deleted',
  EVENT_DELETED: 'event.deleted',
  CATEGORY_DELETED: 'event.category_deleted',
  CLUB_DATA_EXPORTED: 'club.data_exported',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export interface AuditDetails {
  /** Libellé lisible de la cible (nom de tournoi, email d'un membre…). */
  target?: string | null
  /** Contexte additionnel (ex. { from, to }). */
  metadata?: Record<string, unknown> | null
}

/**
 * Enregistre une action sensible. `actor` est l'utilisateur connecté (auteur) ;
 * `clubId`, `userId` et l'email en instantané en sont dérivés.
 */
export async function recordAudit(
  actor: User,
  ip: string | null,
  action: AuditAction,
  details: AuditDetails = {}
): Promise<void> {
  try {
    await AuditLog.create({
      clubId: actor.clubId,
      userId: actor.id,
      actorEmail: actor.email,
      action,
      target: details.target ?? null,
      metadata: details.metadata ?? null,
      ip,
    })
  } catch (error) {
    // Best-effort : ne jamais faire échouer l'action métier à cause du journal.
    logger.warn({ err: error, action }, "Échec d'écriture du journal d'audit")
  }
}
