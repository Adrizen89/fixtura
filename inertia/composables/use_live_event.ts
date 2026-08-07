import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Transmit, type Subscription } from '@adonisjs/transmit-client'
import type { ResultsLiveUpdate } from '~/app/types'

/**
 * Abonnement temps réel (SSE) à un **événement** multi-catégories (#32) — cf.
 * CLAUDE.md §4, §9. Chaque catégorie garde son propre canal
 * (`tournaments/{public_slug}`, cf. #services/realtime) ; on ouvre **une seule**
 * connexion Transmit et on s'abonne à tous les canaux des catégories, en routant
 * chaque mise à jour vers la bonne catégorie via son `publicSlug`.
 *
 * Même dégradation gracieuse que `useLiveTournament` : tout se passe côté client
 * (jamais en SSR) et l'absence d'`EventSource` laisse la page pleinement lisible sur
 * les données rendues par le serveur — seul l'auto-refresh est perdu.
 */

export type LiveConnectionState =
  'idle' | 'connecting' | 'connected' | 'disconnected' | 'unsupported'

export function useLiveEvent(
  publicSlugs: string[],
  onUpdate: (publicSlug: string, update: ResultsLiveUpdate) => void
) {
  const state = ref<LiveConnectionState>('idle')

  let transmit: Transmit | null = null
  const subscriptions: Subscription[] = []
  const stoppers: Array<() => void> = []

  onMounted(async () => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      state.value = 'unsupported'
      return
    }

    try {
      state.value = 'connecting'
      transmit = new Transmit({ baseUrl: window.location.origin })
      transmit.on('connected', () => (state.value = 'connected'))
      transmit.on('reconnecting', () => (state.value = 'connecting'))
      transmit.on('disconnected', () => (state.value = 'disconnected'))

      for (const slug of publicSlugs) {
        const subscription = transmit.subscription(`tournaments/${slug}`)
        await subscription.create()
        const stop = subscription.onMessage<ResultsLiveUpdate>((update) => {
          if (update && update.type === 'results:updated') onUpdate(slug, update)
        })
        subscriptions.push(subscription)
        stoppers.push(stop)
      }
    } catch {
      state.value = 'disconnected'
    }
  })

  onBeforeUnmount(async () => {
    try {
      stoppers.forEach((stop) => stop())
      await Promise.all(subscriptions.map((s) => s.delete()))
      transmit?.close()
    } catch {
      // Nettoyage best-effort.
    }
  })

  return { state }
}
