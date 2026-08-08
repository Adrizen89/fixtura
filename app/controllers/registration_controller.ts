import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator } from '#validators/onboarding'
import { registerClub } from '#services/club_registration'

/**
 * Inscription d'un club (issue #35) — parcours public (invités uniquement).
 *
 * Crée le club et son premier organisateur (`owner`) puis connecte l'utilisateur.
 * Toute la logique (slug unique + transaction) est déléguée au service
 * `club_registration` (contrôleur mince — cf. CLAUDE.md §8).
 */
export default class RegistrationController {
  /** Formulaire d'inscription d'un club. */
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/register', {})
  }

  /** Crée le club + l'owner, connecte, redirige vers le tableau de bord. */
  async register({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    const user = await registerClub({
      clubName: data.clubName,
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    })

    await auth.use('web').login(user)
    session.flash('success', `Bienvenue ! Le club « ${data.clubName.trim()} » est créé.`)
    return response.redirect().toRoute('tournaments.index')
  }
}
