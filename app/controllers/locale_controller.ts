import type { HttpContext } from '@adonisjs/core/http'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Changement de langue (issue #123) — public, sans auth. Pose une préférence
 * explicite (cookie `locale`) puis renvoie sur la page d'origine. Le middleware de
 * locale lit ce cookie en priorité sur l'`Accept-Language`.
 *
 * La valeur est validée contre les langues **prises en charge** ; toute autre est
 * ignorée (repli sur la langue par défaut). Cookie d'un an, non sensible.
 */
export default class LocaleController {
  async update({ params, response }: HttpContext) {
    const requested = i18nManager.getSupportedLocaleFor([params.locale])
    if (requested) {
      response.cookie('locale', requested, { maxAge: '1y', httpOnly: true, sameSite: 'lax' })
    }

    // Retour sur la page d'origine (referer), repli sur l'accueil.
    return response.redirect().back()
  }
}
