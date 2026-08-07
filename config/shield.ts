import { defineConfig } from '@adonisjs/shield'
import app from '@adonisjs/core/services/app'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    enabled: false,
    directives: {},
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    // Protection active en dev/prod ; désactivée sous les tests (`node ace test`)
    // pour permettre les tests fonctionnels de formulaires sans jeton CSRF.
    enabled: !app.inTest,
    // Les endpoints SSE de transmit (`/__transmit/*`) sont exemptés : ils gèrent
    // uniquement des abonnements à un flux public en lecture seule et sont
    // appelés par `@adonisjs/transmit-client` (sans jeton CSRF de formulaire).
    exceptRoutes: (ctx) => ctx.request.url().startsWith('/__transmit'),
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
