import { defineConfig } from '@adonisjs/static'

/**
 * Configuration options to tweak the static files middleware.
 * The complete set of options are documented on the
 * official documentation website.
 *
 * https://docs.adonisjs.com/guides/static-assets
 */

const ONE_YEAR = 60 * 60 * 24 * 365
const ONE_DAY = 60 * 60 * 24

/**
 * Assets construits par Vite : servis sous `/assets/` avec un hash de contenu dans
 * le nom (ex. `app-D_TYWg7P.js`). Le contenu d'une URL donnée ne change jamais.
 */
const HASHED_ASSET = /[/\\]assets[/\\]/

const staticServerConfig = defineConfig({
  enabled: true,
  etag: true,
  lastModified: true,
  dotFiles: 'ignore',

  /**
   * Cache HTTP (cf. audit perf #2). Le `Cache-Control` renvoyé ici écrase le défaut
   * du middleware (`serve-static`) :
   *  - assets hashés (`/assets/…`) → `immutable`, cache long, zéro revalidation
   *    (gain net pour l'écran public rechargé/projeté et les visites répétées) ;
   *  - autres fichiers de `public/` (fonts à nom fixe, favicon…) → cache court +
   *    revalidation via ETag, pour rester corrigeables sans purge.
   */
  headers(path) {
    return {
      'Cache-Control': HASHED_ASSET.test(path)
        ? `public, max-age=${ONE_YEAR}, immutable`
        : `public, max-age=${ONE_DAY}`,
    }
  },
})

export default staticServerConfig
