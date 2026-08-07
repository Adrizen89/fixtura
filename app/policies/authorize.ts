import type { HttpContext } from '@adonisjs/core/http'

/** Message affiché quand une action est réservée au responsable du club. */
export const OWNER_ONLY_MESSAGE = 'Action réservée au responsable du club.'

/**
 * Refuse une action interdite par une policy : dépose un message flash et renvoie
 * une redirection « retour arrière » — un retour Inertia gracieux plutôt qu'une
 * erreur 403 brute. Le contrôleur fait `return deny({ session, response })`.
 */
export function deny(
  ctx: Pick<HttpContext, 'session' | 'response'>,
  message: string = OWNER_ONLY_MESSAGE
) {
  ctx.session.flash('error', message)
  return ctx.response.redirect().back()
}
