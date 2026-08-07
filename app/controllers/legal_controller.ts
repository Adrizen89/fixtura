import type { HttpContext } from '@adonisjs/core/http'

/**
 * Pages légales publiques (cf. CLAUDE.md §10, issue #36) : mentions légales, CGU
 * et politique de confidentialité. Accessibles **sans authentification** —
 * exigence RGPD (information des personnes) et pré-requis à l'ouverture publique.
 *
 * Le contenu vit dans les pages Inertia (`inertia/pages/legal/*`) : contrôleur
 * mince, aucune logique métier (cf. CLAUDE.md §8).
 */
export default class LegalController {
  /** Mentions légales (éditeur, hébergeur, contact). */
  async mentions({ inertia }: HttpContext) {
    return inertia.render('legal/mentions', {})
  }

  /** Conditions générales d'utilisation. */
  async terms({ inertia }: HttpContext) {
    return inertia.render('legal/terms', {})
  }

  /** Politique de confidentialité (traitement des données personnelles). */
  async privacy({ inertia }: HttpContext) {
    return inertia.render('legal/privacy', {})
  }
}
