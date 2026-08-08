/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { createSSRApp, h } from 'vue'
import type { DefineComponent } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

const appName = import.meta.env.VITE_APP_NAME || 'Fixtura'

createInertiaApp({
  // Barre de progression aux couleurs de la marque (vert « terrain »).
  progress: { color: '#16a34a' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(
      `../pages/${name}.vue`,
      import.meta.glob<DefineComponent>('../pages/**/*.vue')
    )
  },

  setup({ el, App, props, plugin }) {
    createSSRApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
})

/**
 * PWA (issue #40) : enregistrement best-effort du service worker pour la résilience
 * hors-ligne de l'écran public (réseau instable au bord des terrains). Aucun impact
 * si indisponible (vieux navigateur, échec) — dégradation gracieuse, pas de polling.
 */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silencieux : l'app reste pleinement fonctionnelle sans service worker.
    })
  })
}
