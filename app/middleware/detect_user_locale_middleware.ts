import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'

/**
 * Détection de la langue de l'utilisateur (issue #123) et partage d'un `i18n` propre
 * à la requête sur le `HttpContext`.
 *
 * Ordre de résolution : **préférence explicite** (cookie `locale` posé par le
 * sélecteur de langue) → négociation via l'en-tête `Accept-Language` → langue par
 * défaut (français). Toute valeur non prise en charge est ignorée (repli FR).
 *
 * Enregistré dans la pile serveur **avant** `inertia_middleware`, si bien que la
 * locale est déjà connue au moment de partager les props Inertia.
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Utilise i18n pour les messages de validation — s'applique aux seuls appels
   * `request.validateUsing`. Le catalogue `resources/lang/{locale}/validator.json`
   * fournit alors les messages (`validator.shared.messages.*`) et les noms de champs
   * (`validator.shared.fields.*`) dans la langue de la requête.
   */
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  /** Locale retenue : cookie de préférence, puis Accept-Language, puis défaut. */
  protected getRequestLocale(ctx: HttpContext): string {
    const preferred = ctx.request.cookie('locale')
    const fromCookie = preferred ? i18nManager.getSupportedLocaleFor([preferred]) : null
    if (fromCookie) return fromCookie

    const negotiated = i18nManager.getSupportedLocaleFor(ctx.request.languages())
    return negotiated || i18nManager.defaultLocale
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const language = this.getRequestLocale(ctx)

    ctx.i18n = i18nManager.locale(language)
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    // Partage avec les templates Edge (vues d'export PDF/HTML), si présents.
    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    return next()
  }
}

/**
 * Déclare la propriété `i18n` sur le HttpContext pour TypeScript.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
