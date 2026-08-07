<script setup lang="ts">
import { computed } from 'vue'
import type { ResultMatchRow } from '~/app/types'

/**
 * Arbre d'élimination directe — affichage **sobre** en colonnes par tour.
 * Lecture seule ; participants nommés (équipe connue ou libellé différé « Vainqueur
 * Quart #1 »), scores affichés une fois joués, vainqueur mis en avant. Défilement
 * horizontal sur mobile ; lisible de loin (écran public).
 */
const props = defineProps<{ matches: ResultMatchRow[] }>()

const sides = ['home', 'away'] as const

const ROUND_ORDER = ['r64', 'r32', 'r16', 'qf', 'sf', 'final']
const ROUND_LABEL: Record<string, string> = {
  r64: '32es de finale',
  r32: '16es de finale',
  r16: '8es de finale',
  qf: 'Quarts',
  sf: 'Demi-finales',
  final: 'Finale',
  third: 'Petite finale',
}

const ko = computed(() => props.matches.filter((m) => m.stage === 'knockout'))

/** Colonnes = tours présents, ordonnés ; petite finale traitée à part. */
const columns = computed(() => {
  const present = new Set(ko.value.map((m) => m.bracketRound))
  return ROUND_ORDER.filter((r) => present.has(r)).map((round) => ({
    round,
    label: ROUND_LABEL[round] ?? round,
    matches: ko.value
      .filter((m) => m.bracketRound === round)
      .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0)),
  }))
})

const third = computed(() => ko.value.find((m) => m.bracketRound === 'third') ?? null)

function isPlayed(m: ResultMatchRow) {
  return m.homeScore !== null && m.awayScore !== null
}

/** Côté vainqueur ('home' | 'away') pour la mise en avant, ou null. */
function winnerSide(m: ResultMatchRow): 'home' | 'away' | null {
  if (!isPlayed(m)) return null
  if ((m.homeScore as number) > (m.awayScore as number)) return 'home'
  if ((m.awayScore as number) > (m.homeScore as number)) return 'away'
  return null
}

const teamName = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeTeam : m.awayTeam
const teamScore = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeScore : m.awayScore
</script>

<template>
  <div v-if="ko.length">
    <div class="overflow-x-auto pb-2">
      <div class="flex gap-4">
        <div
          v-for="col in columns"
          :key="col.round"
          class="flex min-w-[12rem] flex-1 flex-col gap-2"
        >
          <h3 class="text-xs font-semibold uppercase tracking-wide text-sand-9">{{ col.label }}</h3>
          <div class="flex flex-1 flex-col justify-around gap-3">
            <div
              v-for="m in col.matches"
              :key="m.id"
              class="rounded-lg border border-sand-6 bg-white"
            >
              <div
                v-for="side in sides"
                :key="side"
                class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm sm:text-base"
                :class="[
                  side === 'home' ? 'border-b border-sand-4' : '',
                  winnerSide(m) === side ? 'font-bold text-sand-12' : 'text-sand-11',
                ]"
              >
                <span class="min-w-0 truncate">{{ teamName(m, side) }}</span>
                <span v-if="isPlayed(m)" class="shrink-0 tabular-nums">{{ teamScore(m, side) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Petite finale (3e place) -->
    <div v-if="third" class="mt-4 border-t border-sand-5 pt-4">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-9">
        {{ ROUND_LABEL.third }}
      </h3>
      <div class="max-w-xs rounded-lg border border-sand-6 bg-white">
        <div
          v-for="side in sides"
          :key="side"
          class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm sm:text-base"
          :class="[
            side === 'home' ? 'border-b border-sand-4' : '',
            winnerSide(third) === side ? 'font-bold text-sand-12' : 'text-sand-11',
          ]"
        >
          <span class="min-w-0 truncate">{{ teamName(third, side) }}</span>
          <span v-if="isPlayed(third)" class="shrink-0 tabular-nums">
            {{ teamScore(third, side) }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-sm text-sand-11">
    Le tableau final s'affichera une fois le planning généré.
  </p>
</template>
