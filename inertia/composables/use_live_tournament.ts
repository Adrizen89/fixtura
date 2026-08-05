import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Transmit, type Subscription } from '@adonisjs/transmit-client'
import type { ResultsLiveUpdate } from '~/app/types'

/**
 * Abonnement temps réel (SSE) au flux d'un tournoi — cf. CLAUDE.md §4, §9.
 *
 * Dégradation gracieuse : tout se passe côté client (jamais en SSR), et si les
 * `EventSource` sont indisponibles (navigateur ancien, proxy qui coupe le flux,
 * réseau) on bascule silencieusement en état `unsupported`/`disconnected` sans
 * lever d'erreur. La page reste pleinement fonctionnelle avec les données rendues
 * par le serveur ; seul le rafraîchissement automatique est perdu.
 *
 * Le canal doit correspondre à celui du serveur (#services/realtime →
 * `tournaments/${publicSlug}`).
 */

export type LiveConnectionState =
  'idle' | 'connecting' | 'connected' | 'disconnected' | 'unsupported'

export function useLiveTournament(
  publicSlug: string,
  onUpdate: (update: ResultsLiveUpdate) => void
) {
  const state = ref<LiveConnectionState>('idle')

  let transmit: Transmit | null = null
  let subscription: Subscription | null = null
  let stopMessages: (() => void) | null = null

  onMounted(async () => {
    // Garde SSR + navigateurs sans EventSource → pas de live, mais aucune erreur.
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      state.value = 'unsupported'
      return
    }

    try {
      state.value = 'connecting'
      transmit = new Transmit({ baseUrl: window.location.origin })

      // Suivi de l'état de connexion (pour un éventuel indicateur discret).
      transmit.on('connected', () => (state.value = 'connected'))
      transmit.on('reconnecting', () => (state.value = 'connecting'))
      transmit.on('disconnected', () => (state.value = 'disconnected'))

      subscription = transmit.subscription(`tournaments/${publicSlug}`)
      await subscription.create()
      stopMessages = subscription.onMessage<ResultsLiveUpdate>((update) => {
        if (update && update.type === 'results:updated') onUpdate(update)
      })
    } catch {
      // SSE indisponible : on reste sur les données serveur (dégradation gracieuse).
      state.value = 'disconnected'
    }
  })

  onBeforeUnmount(async () => {
    try {
      stopMessages?.()
      await subscription?.delete()
      transmit?.close()
    } catch {
      // Nettoyage best-effort : rien de bloquant à la destruction du composant.
    }
  })

  return { state }
}
