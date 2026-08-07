import type { HttpContext } from '@adonisjs/core/http'
import Club from '#models/club'
import { clubBrandingValidator } from '#validators/club_branding'

/**
 * Personnalisation du club — logo + couleur d'accent sur l'écran public (issue #40).
 *
 * Réservé au rôle `owner` (représentant du club, cohérent avec l'espace compte RGPD).
 * Le club est toujours celui du compte connecté (`auth.user.clubId`) : jamais un autre.
 */
export default class ClubController {
  /** Formulaire d'apparence (logo + couleur) du club. */
  async edit({ inertia, response, auth }: HttpContext) {
    const user = auth.user!
    if (user.role !== 'owner') {
      return response.forbidden({ message: 'Réservé au responsable du club.' })
    }

    const club = await Club.findOrFail(user.clubId)
    return inertia.render('club/appearance', {
      club: { name: club.name, logo: club.logo, primaryColor: club.primaryColor },
    })
  }

  /** Enregistre le logo (data-URI) et/ou la couleur — vide = valeur retirée. */
  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.user!
    if (user.role !== 'owner') {
      return response.forbidden({ message: 'Réservé au responsable du club.' })
    }

    const { logo, primaryColor } = await request.validateUsing(clubBrandingValidator)

    const club = await Club.findOrFail(user.clubId)
    // Le formulaire porte l'état complet voulu : une valeur vide efface le réglage.
    club.logo = logo ? logo : null
    club.primaryColor = primaryColor ? primaryColor : null
    await club.save()

    session.flash('success', 'Apparence du club mise à jour.')
    return response.redirect().toPath('/club/apparence')
  }
}
