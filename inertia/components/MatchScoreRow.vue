<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { ResultMatchRow } from '~/app/types'

const props = defineProps<{
  match: ResultMatchRow
  tournamentId: number
}>()

const form = useForm<{ homeScore: number | null; awayScore: number | null }>({
  homeScore: props.match.homeScore,
  awayScore: props.match.awayScore,
})

/**
 * Reflète en direct un score saisi par un autre organisateur (props mises à jour
 * via SSE), sauf si une saisie est en cours dans cette ligne (`form.isDirty`) —
 * on ne clobbe jamais ce que l'utilisateur est en train de taper.
 */
watch(
  () => [props.match.homeScore, props.match.awayScore] as const,
  ([homeScore, awayScore]) => {
    if (form.isDirty) return
    form.homeScore = homeScore
    form.awayScore = awayScore
    form.defaults({ homeScore, awayScore })
  }
)

function submit() {
  form.patch(`/tournaments/${props.tournamentId}/matches/${props.match.id}`, {
    preserveScroll: true,
  })
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <form class="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2" @submit.prevent="submit">
    <span
      class="w-8 shrink-0 rounded-md bg-sand-3 px-2 py-0.5 text-center text-xs font-medium text-sand-11"
    >
      T{{ match.terrainNumber }}
    </span>

    <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
      <label :for="`h-${match.id}`" class="min-w-0 flex-1 truncate text-right text-sm text-sand-12">
        {{ match.homeTeam }}
      </label>
      <input
        :id="`h-${match.id}`"
        v-model.number="form.homeScore"
        type="number"
        min="0"
        max="99"
        required
        inputmode="numeric"
        aria-label="Score domicile"
        class="w-14 rounded-lg border border-sand-7 px-2 py-1.5 text-center tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        :class="{ 'border-red-400': form.errors.homeScore }"
      />
      <span class="text-sand-9">–</span>
      <input
        v-model.number="form.awayScore"
        type="number"
        min="0"
        max="99"
        required
        inputmode="numeric"
        aria-label="Score extérieur"
        class="w-14 rounded-lg border border-sand-7 px-2 py-1.5 text-center tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        :class="{ 'border-red-400': form.errors.awayScore }"
      />
      <span class="min-w-0 flex-1 truncate text-sm text-sand-12">{{ match.awayTeam }}</span>
    </div>

    <button
      type="submit"
      :disabled="form.processing"
      class="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Enregistrer
    </button>

    <p
      v-if="match.updatedBy"
      class="w-full shrink-0 text-xs text-sand-9"
      :class="{ 'sm:w-auto sm:ml-2': true }"
    >
      Saisi par {{ match.updatedBy
      }}<span v-if="match.updatedAt"> · {{ formatTime(match.updatedAt) }}</span>
    </p>
  </form>
</template>
