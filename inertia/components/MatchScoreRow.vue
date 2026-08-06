<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { ResultMatchRow } from '~/app/types'

const props = defineProps<{
  match: ResultMatchRow
  tournamentId: number
  numTerrains: number
}>()

const base = computed(() => `/tournaments/${props.tournamentId}/matches/${props.match.id}`)

const isForfeit = computed(() => props.match.status === 'forfeit')
const forfeitTeam = computed(() => {
  if (props.match.forfeitSide === 'home') return props.match.homeTeam
  if (props.match.forfeitSide === 'away') return props.match.awayTeam
  return null
})

/** Panneau « aléas » replié par défaut pour garder la ligne compacte (mobile-first). */
const showIncidents = ref(false)

/* --- Saisie / correction du score ---------------------------------------- */
const scoreForm = useForm<{ homeScore: number | null; awayScore: number | null }>({
  homeScore: props.match.homeScore,
  awayScore: props.match.awayScore,
})

/**
 * Reflète en direct un score saisi par un autre organisateur (props mises à jour
 * via SSE), sauf si une saisie est en cours dans cette ligne (`isDirty`) — on ne
 * clobbe jamais ce que l'utilisateur est en train de taper.
 */
watch(
  () => [props.match.homeScore, props.match.awayScore] as const,
  ([homeScore, awayScore]) => {
    if (scoreForm.isDirty) return
    scoreForm.homeScore = homeScore
    scoreForm.awayScore = awayScore
    scoreForm.defaults({ homeScore, awayScore })
  }
)

function submitScore() {
  scoreForm.patch(base.value, { preserveScroll: true })
}

/* --- Aléas : décaler le match -------------------------------------------- */
const scheduleForm = useForm<{ time: string; terrainNumber: number }>({
  time: props.match.time,
  terrainNumber: props.match.terrainNumber,
})

// Suit l'horaire/terrain poussé par SSE tant que l'organisateur n'édite pas ce champ.
watch(
  () => [props.match.time, props.match.terrainNumber] as const,
  ([time, terrainNumber]) => {
    if (scheduleForm.isDirty) return
    scheduleForm.time = time
    scheduleForm.terrainNumber = terrainNumber
    scheduleForm.defaults({ time, terrainNumber })
  }
)

function submitReschedule() {
  scheduleForm.patch(`${base.value}/schedule`, { preserveScroll: true })
}

/* --- Aléas : déclarer un forfait ----------------------------------------- */
const forfeitForm = useForm<{ side: 'home' | 'away' }>({ side: 'home' })

function declareForfeit(side: 'home' | 'away') {
  forfeitForm.side = side
  forfeitForm.patch(`${base.value}/forfeit`, { preserveScroll: true })
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="py-2">
    <form class="flex flex-wrap items-center gap-x-3 gap-y-1.5" @submit.prevent="submitScore">
      <span
        class="w-8 shrink-0 rounded-md bg-sand-3 px-2 py-0.5 text-center text-xs font-medium text-sand-11"
      >
        T{{ match.terrainNumber }}
      </span>

      <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <label
          :for="`h-${match.id}`"
          class="min-w-0 flex-1 truncate text-right text-sm text-sand-12"
        >
          {{ match.homeTeam }}
        </label>
        <input
          :id="`h-${match.id}`"
          v-model.number="scoreForm.homeScore"
          type="number"
          min="0"
          max="99"
          required
          inputmode="numeric"
          aria-label="Score domicile"
          class="w-14 rounded-lg border border-sand-7 px-2 py-1.5 text-center tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': scoreForm.errors.homeScore }"
        />
        <span class="text-sand-9">–</span>
        <input
          v-model.number="scoreForm.awayScore"
          type="number"
          min="0"
          max="99"
          required
          inputmode="numeric"
          aria-label="Score extérieur"
          class="w-14 rounded-lg border border-sand-7 px-2 py-1.5 text-center tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': scoreForm.errors.awayScore }"
        />
        <span class="min-w-0 flex-1 truncate text-sm text-sand-12">{{ match.awayTeam }}</span>
      </div>

      <button
        type="submit"
        :disabled="scoreForm.processing"
        class="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Enregistrer
      </button>

      <!-- Bascule du panneau « aléas » (décaler / forfait). -->
      <button
        type="button"
        :aria-expanded="showIncidents"
        :aria-controls="`incidents-${match.id}`"
        class="shrink-0 rounded-lg border border-sand-7 px-2 py-1.5 text-sm text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        title="Aléas : décaler, forfait"
        @click="showIncidents = !showIncidents"
      >
        Aléas {{ showIncidents ? '▴' : '▾' }}
      </button>
    </form>

    <!-- Ligne d'état : forfait et/ou dernière saisie. -->
    <p
      v-if="isForfeit || match.updatedBy"
      class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-11 text-xs text-sand-9"
    >
      <span
        v-if="isForfeit"
        class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
      >
        Forfait{{ forfeitTeam ? ` — ${forfeitTeam}` : '' }}
      </span>
      <span v-if="match.updatedBy">
        Saisi par {{ match.updatedBy
        }}<span v-if="match.updatedAt"> · {{ formatTime(match.updatedAt) }}</span>
      </span>
    </p>

    <!-- Panneau aléas -->
    <div
      v-if="showIncidents"
      :id="`incidents-${match.id}`"
      class="mt-2 space-y-3 rounded-lg border border-sand-5 bg-sand-2 p-3 pl-11"
    >
      <!-- Décaler le match -->
      <form class="flex flex-wrap items-center gap-2" @submit.prevent="submitReschedule">
        <span class="text-xs font-semibold uppercase tracking-wide text-sand-10">Décaler</span>
        <input
          v-model="scheduleForm.time"
          type="time"
          required
          :aria-label="`Nouvelle heure de ${match.homeTeam} contre ${match.awayTeam}`"
          class="rounded-lg border border-sand-7 px-2 py-1 text-sm tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': scheduleForm.errors.time }"
        />
        <label class="flex items-center gap-1 text-sm text-sand-11">
          Terrain
          <select
            v-model.number="scheduleForm.terrainNumber"
            aria-label="Terrain"
            class="rounded-lg border border-sand-7 px-2 py-1 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option v-for="n in numTerrains" :key="n" :value="n">T{{ n }}</option>
          </select>
        </label>
        <button
          type="submit"
          :disabled="scheduleForm.processing"
          class="rounded-lg border border-sand-7 px-3 py-1 text-sm font-medium text-sand-12 transition hover:bg-sand-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Décaler
        </button>
      </form>

      <!-- Déclarer un forfait -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-sand-10">Forfait</span>
        <button
          type="button"
          :disabled="forfeitForm.processing"
          class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="declareForfeit('home')"
        >
          {{ match.homeTeam }}
        </button>
        <button
          type="button"
          :disabled="forfeitForm.processing"
          class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="declareForfeit('away')"
        >
          {{ match.awayTeam }}
        </button>
        <span class="text-xs text-sand-9">déclare forfait (défaite 3–0)</span>
      </div>
    </div>
  </div>
</template>
