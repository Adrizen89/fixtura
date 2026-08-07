<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  diffFollowedTeam,
  hasFinishedAll,
  nextMatchFor,
  opponentName,
} from '~/composables/next_match'
import type { ResultMatchRow } from '~/app/types'

/**
 * Suivi d'équipe sur l'écran public (cf. CLAUDE.md §9 · issue #39).
 *
 * L'équipe (ou son supporter) choisit « son » équipe : on affiche alors son prochain
 * match (terrain + horaire) et on la prévient en direct des changements qui la
 * concernent (décalage, changement de terrain, forfait adverse). Tout est dérivé des
 * matchs déjà diffusés en SSE : le composant observe simplement la liste `matches`
 * (réactualisée par le parent à chaque événement) et compare l'ancien au nouvel état.
 *
 * Dégradation gracieuse : le prochain match reste calculé depuis le rendu serveur,
 * même sans SSE ; seules les alertes en direct sont perdues (pas de polling — §13).
 * Le choix est mémorisé en `localStorage` (par tournoi). Les notifications navigateur
 * sont **optionnelles** et best-effort (premier plan, sans service worker / Web Push).
 */
const props = defineProps<{
  publicSlug: string
  teams: { id: number; name: string }[]
  matches: ResultMatchRow[]
}>()

const STORAGE_KEY = `fixtura:follow:${props.publicSlug}`

const followedTeamId = ref<number | null>(null)

const sortedTeams = computed(() => [...props.teams].sort((a, b) => a.name.localeCompare(b.name)))

const followedTeamName = computed(
  () => props.teams.find((t) => t.id === followedTeamId.value)?.name ?? null
)

const nextMatch = computed(() =>
  followedTeamId.value !== null ? nextMatchFor(props.matches, followedTeamId.value) : null
)

const finishedAll = computed(
  () => followedTeamId.value !== null && hasFinishedAll(props.matches, followedTeamId.value)
)

/** Adversaire du prochain match (libellé lisible, y compris slot différé). */
const nextOpponent = computed(() =>
  nextMatch.value && followedTeamId.value !== null
    ? opponentName(nextMatch.value, followedTeamId.value)
    : ''
)

// --- Alertes en direct (pile de « toasts » accessibles) ---
interface Toast {
  id: number
  message: string
}
const alerts = ref<Toast[]>([])
let toastSeq = 0
const timers = new Set<ReturnType<typeof setTimeout>>()

function dismiss(id: number) {
  alerts.value = alerts.value.filter((a) => a.id !== id)
}

function pushToast(message: string) {
  const id = ++toastSeq
  alerts.value = [...alerts.value, { id, message }]
  const timer = setTimeout(() => {
    dismiss(id)
    timers.delete(timer)
  }, 12000)
  timers.add(timer)
}

// --- Notifications navigateur (optionnelles, best-effort) ---
type NotifState = 'unsupported' | 'default' | 'granted' | 'denied'
const notifState = ref<NotifState>('unsupported')

function refreshNotifState() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    notifState.value = 'unsupported'
    return
  }
  notifState.value = Notification.permission as NotifState
}

async function enableNotifications() {
  if (notifState.value !== 'default') return
  try {
    const result = await Notification.requestPermission()
    notifState.value = result as NotifState
  } catch {
    // API indisponible / refus silencieux : on reste sur les alertes à l'écran.
    refreshNotifState()
  }
}

/** Notifie via le navigateur, uniquement onglet en arrière-plan (sinon le toast suffit). */
function notify(message: string) {
  if (notifState.value !== 'granted') return
  if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return
  try {
    const title = `Fixtura${followedTeamName.value ? ` — ${followedTeamName.value}` : ''}`
    new Notification(title, { body: message })
  } catch {
    // Best-effort : ne jamais casser l'affichage pour une notification.
  }
}

function persist(id: number | null) {
  if (typeof window === 'undefined') return
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    // localStorage indisponible (mode privé strict) : le suivi reste en mémoire.
  }
}

function onSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const id = value === '' ? null : Number(value)
  followedTeamId.value = id
  alerts.value = []
  persist(id)
}

onMounted(() => {
  refreshNotifState()
  // Restaure le choix précédent s'il correspond toujours à une équipe du tournoi.
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const id = Number(saved)
      if (props.teams.some((t) => t.id === id)) followedTeamId.value = id
    }
  } catch {
    // Ignore : pas de restauration si localStorage est bloqué.
  }
})

onBeforeUnmount(() => {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
})

/**
 * Cœur du temps réel : à chaque nouvelle liste de matchs poussée par le parent (SSE),
 * on compare à l'état précédent et on lève les alertes concernant l'équipe suivie.
 * Le watcher ne se déclenche pas au montage → aucune alerte parasite au chargement.
 */
watch(
  () => props.matches,
  (next, prev) => {
    if (followedTeamId.value === null || !prev) return
    for (const alert of diffFollowedTeam(prev, next, followedTeamId.value)) {
      pushToast(alert.message)
      notify(alert.message)
    }
  }
)
</script>

<template>
  <section class="mb-8 rounded-2xl border border-sand-6 bg-white p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <label for="follow-team" class="text-sm font-semibold text-sand-12 sm:text-base">
          Suivre mon équipe
        </label>
        <select
          id="follow-team"
          class="rounded-lg border border-sand-7 bg-white px-3 py-1.5 text-sm font-medium text-sand-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-base"
          :value="followedTeamId ?? ''"
          @change="onSelect"
        >
          <option value="">— Choisir —</option>
          <option v-for="team in sortedTeams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>
      </div>

      <!-- Activation optionnelle des notifications navigateur -->
      <button
        v-if="followedTeamId !== null && notifState === 'default'"
        type="button"
        class="rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        @click="enableNotifications"
      >
        🔔 Activer les notifications
      </button>
      <span
        v-else-if="followedTeamId !== null && notifState === 'granted'"
        class="text-xs font-medium text-sand-10"
      >
        🔔 Notifications activées
      </span>
    </div>

    <!-- Prochain match de l'équipe suivie (mis en avant, lisible de loin) -->
    <div v-if="followedTeamId !== null" class="mt-4">
      <div
        v-if="nextMatch"
        class="rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-4 sm:px-5"
      >
        <p class="text-xs font-bold uppercase tracking-wide text-primary-800 sm:text-sm">
          Votre prochain match
        </p>
        <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span class="text-2xl font-extrabold tabular-nums text-sand-12 sm:text-3xl">
            {{ nextMatch.time }}
          </span>
          <span
            class="rounded-lg bg-sand-12 px-2.5 py-1 text-base font-bold text-sand-1 sm:text-lg"
          >
            Terrain {{ nextMatch.terrainNumber }}
          </span>
          <span class="text-lg font-semibold text-sand-11 sm:text-xl">
            contre {{ nextOpponent }}
          </span>
        </div>
      </div>
      <p
        v-else-if="finishedAll"
        class="rounded-xl bg-sand-2 px-4 py-3 text-center text-base text-sand-11"
      >
        Tous vos matchs sont terminés. Rendez-vous au classement !
      </p>
      <p v-else class="rounded-xl bg-sand-2 px-4 py-3 text-center text-base text-sand-11">
        Aucun match à venir pour l'instant.
      </p>
    </div>

    <!-- Alertes en direct (changements concernant l'équipe suivie) -->
    <ul
      v-if="alerts.length"
      class="mt-3 space-y-2"
      aria-live="polite"
      aria-label="Notifications de votre équipe"
    >
      <li
        v-for="alert in alerts"
        :key="alert.id"
        class="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 sm:text-base"
      >
        <span>{{ alert.message }}</span>
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-amber-700 hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Masquer cette alerte"
          @click="dismiss(alert.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </section>
</template>
