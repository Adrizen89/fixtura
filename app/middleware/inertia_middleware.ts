import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import Club from '#models/club'

/**
 * Middleware Inertia (AdonisJS 7 / Inertia v4).
 *
 * En v4, les données partagées ne se déclarent plus dans `config/inertia.ts` mais
 * via la méthode `share` d'un middleware qui étend `BaseInertiaMiddleware`. La base
 * fournit `init`/`dispose` ; on câble le `handle` (init → next → dispose) et on
 * expose ici les props partagées avec toutes les pages : l'organisateur connecté,
 * les messages flash, et les erreurs de validation VineJS (prop `errors`).
 */
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    const user = ctx.auth?.user
    // Club courant (contexte multi-tenant — issue #34) : exposé à toutes les pages
    // pour afficher le club actif dans l'en-tête. Chargé une fois par requête
    // authentifiée (recherche par clé primaire, négligeable).
    const club = user ? await Club.find(user.clubId) : null

    return {
      /**
       * Erreurs de validation (bag `inputErrorsBag`) formatées pour Inertia —
       * comportement rendu explicite en v4 (n'était plus automatique).
       */
      errors: this.getValidationErrors(ctx),

      /**
       * Organisateur connecté (ou null). `always` => présent aussi lors des
       * rechargements partiels (uniquement quand il y a un utilisateur : en v4,
       * `always(null)` n'est pas sérialisable). Peuplé par le middleware silent_auth.
       */
      auth: user
        ? ctx.inertia.always({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          })
        : null,

      /**
       * Club courant de l'utilisateur connecté (contexte multi-tenant, issue #34).
       * Présent aussi lors des rechargements partiels (`always`), uniquement quand
       * il existe (`always(null)` n'est pas sérialisable en v4).
       */
      currentClub: club
        ? ctx.inertia.always({ id: club.id, name: club.name, slug: club.slug })
        : null,

      /**
       * Messages flash (bannières succès / erreur).
       */
      flash: {
        success: ctx.session?.flashMessages.get('success') ?? null,
        error: ctx.session?.flashMessages.get('error') ?? null,
      },

      /**
       * Langue active de la requête (issue #123) — le front choisit le dictionnaire
       * bundlé correspondant (`always` : présent aussi lors des rechargements partiels).
       */
      locale: ctx.inertia.always(ctx.i18n?.locale ?? 'fr'),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
  }
}
