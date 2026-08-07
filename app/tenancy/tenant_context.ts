import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Contexte multi-tenant de la requête courante (issue #34, fondation multi-club).
 *
 * Porte l'identifiant du **club courant** pour toute la durée d'une requête HTTP
 * authentifiée, via un `AsyncLocalStorage` : le `TenantMiddleware` l'ouvre juste
 * après l'authentification (`run`), et le scope global des modèles racines
 * (`Tournament`, `Event` — cf. `withTenantScope`) le lit (`currentClubId`) pour
 * filtrer automatiquement sur `club_id`. Plus besoin d'appliquer `forClub` à la
 * main dans chaque contrôleur (cf. CLAUDE.md §5, §9, §12).
 *
 * Hors requête (CLI `ace`, seeders, montage de fixtures de test), aucun contexte
 * n'est ouvert : `currentClubId()` renvoie `null` et le scope global ne s'applique
 * pas — les opérations transverses par club (`club:export`, `club:delete`) ciblent
 * alors un club explicite sans interférence.
 */
interface TenantStore {
  clubId: number
}

const storage = new AsyncLocalStorage<TenantStore>()

export const TenantContext = {
  /**
   * Exécute `callback` avec le club `clubId` comme club courant. Le contexte reste
   * actif pour toute la chaîne asynchrone descendante (contrôleur, services,
   * requêtes Lucid), puis se referme automatiquement au retour.
   */
  run<T>(clubId: number, callback: () => T): T {
    return storage.run({ clubId }, callback)
  },

  /** Identifiant du club courant, ou `null` hors d'un contexte de requête. */
  currentClubId(): number | null {
    return storage.getStore()?.clubId ?? null
  },

  /**
   * Exécute `callback` **hors** de tout contexte tenant (échappatoire explicite) :
   * les requêtes qui doivent volontairement franchir le cloisonnement (rare) le
   * font sans surprise. Le scope global ne s'applique pas pendant l'exécution.
   */
  bypass<T>(callback: () => T): T {
    return storage.exit(callback)
  },
}
