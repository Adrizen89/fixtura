import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

/**
 * Configuration du chiffrement (AdonisJS 7).
 *
 * En v6, l'`appKey` (config/app.ts) servait directement au chiffrement ; la v7
 * exige ce fichier dédié. On utilise le driver **legacy**, compatible avec le
 * schéma v6, afin que les valeurs déjà chiffrées — notamment les cookies de
 * session des organisateurs connectés — restent valides après la migration.
 */
const encryptionConfig = defineConfig({
  default: 'legacy',
  list: {
    legacy: drivers.legacy({ keys: [env.get('APP_KEY')] }),
  },
})

export default encryptionConfig
