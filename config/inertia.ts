import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    /**
     * Organisateur connecté (ou null). `always` => présent aussi lors des
     * rechargements partiels. Peuplé par le middleware silent_auth.
     */
    auth: (ctx) =>
      ctx.inertia.always(() =>
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
     * Messages flash (bannières succès / erreur). Les erreurs de validation
     * VineJS sont, elles, partagées automatiquement via la prop `errors`.
     */
    flash: (ctx) => ({
      success: ctx.session?.flashMessages.get('success') ?? null,
      error: ctx.session?.flashMessages.get('error') ?? null,
    }),
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.ts',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
