import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#validators/auth'
import { recordAudit, AUDIT_ACTIONS } from '#services/audit_log'

export default class AuthController {
  /**
   * Affiche le formulaire de connexion.
   */
  async showLogin({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  /**
   * Traite la connexion d'un organisateur (guard session « web »).
   */
  async login({ request, response, auth, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      // Journal d'audit : connexion réussie (issue #117).
      await recordAudit(user, request.ip(), AUDIT_ACTIONS.LOGIN)
    } catch {
      session.flash('error', 'Identifiants invalides.')
      // On re-flash l'email saisi pour ne pas le perdre, jamais le mot de passe.
      session.flashExcept(['password'])
      return response.redirect().back()
    }

    return response.redirect().toRoute('tournaments.index')
  }

  /**
   * Déconnexion.
   */
  async logout({ response, auth }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('login.show')
  }
}
