import { defineConfig } from '@adonisjs/inertia'

/**
 * Configuration Inertia (AdonisJS 7 / Inertia v4).
 *
 * En v4, les **données partagées** ne se déclarent plus ici : elles vivent dans
 * `app/middleware/inertia_middleware.ts` (méthode `share`). Ce fichier ne porte
 * plus que le `rootView` et le rendu côté serveur (SSR).
 */
const inertiaConfig = defineConfig({
  /**
   * Vue Edge servant de racine aux réponses Inertia.
   */
  rootView: 'inertia_layout',

  /**
   * Rendu côté serveur (écran public lisible de loin + SEO léger).
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.ts',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  /**
   * Props partagées avec toutes les pages — peuplées par `InertiaMiddleware.share`.
   */
  export interface SharedProps {
    auth: {
      id: number
      fullName: string | null
      email: string
      role: 'owner' | 'organizer'
    } | null
    flash: {
      success: string | null
      error: string | null
    }
  }

  /**
   * Pages Inertia. Augmentation **permissive** : on conserve l'ergonomie de la v3
   * (`inertia.render('page', props)` sans typage page par page). Un typage strict
   * par page (une entrée par page + ses props) pourra être ajouté ultérieurement.
   */
  export interface InertiaPages {
    [page: string]: Record<string, any>
  }
}
