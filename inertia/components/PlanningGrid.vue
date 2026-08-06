<script setup lang="ts">
import type { PlanningSlotView } from '~/app/types'

defineProps<{
  slots: PlanningSlotView[]
  /** Affiche la colonne des scores (planning persisté). */
  showScores?: boolean
}>()

function scoreLabel(home: number | null, away: number | null) {
  if (home === null || away === null) return '—'
  return `${home} – ${away}`
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        Planning des matchs par créneau horaire, terrain et affiche.
      </caption>
      <thead>
        <tr class="border-b border-sand-6 text-left text-xs uppercase tracking-wide text-sand-9">
          <th scope="col" class="py-2 pr-4 font-medium">Heure</th>
          <th scope="col" class="py-2 pr-4 font-medium">Terrain</th>
          <th scope="col" class="py-2 pr-4 font-medium">Match</th>
          <th v-if="showScores" scope="col" class="py-2 font-medium">Score</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="slot in slots" :key="slot.time">
          <tr
            v-for="(match, index) in slot.matches"
            :key="`${slot.time}-${match.terrainNumber}`"
            :class="['align-top', index === 0 ? 'border-t border-sand-5' : '']"
          >
            <td class="py-2 pr-4 font-medium tabular-nums text-sand-12">
              {{ index === 0 ? slot.time : '' }}
            </td>
            <td class="py-2 pr-4">
              <span
                class="inline-block rounded-md bg-sand-3 px-2 py-0.5 text-xs font-medium text-sand-11"
              >
                T{{ match.terrainNumber }}
              </span>
            </td>
            <td class="py-2 pr-4 text-sand-12">
              <span>{{ match.homeTeam }}</span>
              <span class="px-1.5 text-sand-9">vs</span>
              <span>{{ match.awayTeam }}</span>
            </td>
            <td v-if="showScores" class="py-2 tabular-nums text-sand-12">
              {{ scoreLabel(match.homeScore, match.awayScore) }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
