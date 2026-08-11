import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'

/**
 * Internationalisation (issue #123). Le français reste la langue par défaut et le
 * **fallback** : toute clé absente en anglais retombe sur le français. L'anglais est
 * la seconde langue prise en charge (« au minimum l'anglais »).
 *
 * Côté serveur, ces catalogues alimentent :
 *   - les **messages de validation** VineJS (`resources/lang/{locale}/validator.json`),
 *     câblés via `RequestValidator.messagesProvider` dans le middleware de locale ;
 *   - les **messages flash** serveur (`resources/lang/{locale}/messages.json`), lus par
 *     `ctx.i18n.t('messages.…')` dans les contrôleurs en périmètre (auth + public).
 *
 * Les chaînes d'interface **front** vivent, elles, dans des dictionnaires bundlés
 * (`inertia/i18n/{fr,en}.ts`) sélectionnés par la locale partagée — pas de rechargement
 * réseau, rendu SSR cohérent.
 */
const i18nConfig = defineConfig({
  defaultLocale: 'fr',
  // Le formatter ICU interpole en simples accolades : « {field} », « {min} »…
  formatter: formatters.icu(),

  loaders: [
    loaders.fs({
      location: app.languageFilesPath(),
    }),
  ],
})

export default i18nConfig
