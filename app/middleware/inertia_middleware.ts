import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

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
    return {
      /**
       * Erreurs de validation (bag `inputErrorsBag`) formatées pour Inertia —
       * comportement rendu explicite en v4 (n'était plus automatique).
       */
      errors: this.getValidationErrors(ctx),

      /**
       * Organisateur connecté (ou null). `always` => présent aussi lors des
       * rechargements partiels. Peuplé par le middleware silent_auth.
       */
      auth: ctx.inertia.always(
        ctx.auth?.user
          ? {
              id: ctx.auth.user.id,
              fullName: ctx.auth.user.fullName,
              email: ctx.auth.user.email,
              role: ctx.auth.user.role,
            }
          : null
      ),

      /**
       * Messages flash (bannières succès / erreur).
       */
      flash: {
        success: ctx.session?.flashMessages.get('success') ?? null,
        error: ctx.session?.flashMessages.get('error') ?? null,
      },
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
  }
}
