<script setup lang="ts">
import { computed } from 'vue'
import type { ResultMatchRow } from '~/app/types'
import { finalRanking, ordinalFr } from '~/composables/final_ranking'
import DoubleEliminationBracket from '~/components/DoubleEliminationBracket.vue'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

/**
 * Arbre d'élimination directe — affichage **sobre** en colonnes par tour.
 * Lecture seule ; participants nommés (équipe connue ou libellé différé « Vainqueur
 * Quart #1 »), scores affichés une fois joués, vainqueur mis en avant. Défilement
 * horizontal sur mobile ; lisible de loin (écran public).
 *
 * La **double élimination** (#111) a une structure différente (tableau principal +
 * repêchage + grande finale) : on délègue alors à `DoubleEliminationBracket`.
 */
const props = defineProps<{ matches: ResultMatchRow[] }>()

const sides = ['home', 'away'] as const

/** Détecte un tableau à double élimination via ses codes de tour (`wb-`/`lb-`/`gf`). */
const isDoubleElimination = computed(() =>
  props.matches.some(
    (m) =>
      m.stage === 'knockout' &&
      (m.bracketRound === 'gf' ||
        m.bracketRound?.startsWith('wb-') === true ||
        m.bracketRound?.startsWith('lb-') === true)
  )
)

const ROUND_ORDER = ['r64', 'r32', 'r16', 'qf', 'sf', 'final']
const ROUND_LABEL = computed<Record<string, string>>(() => ({
  r64: t('bracket.r64'),
  r32: t('bracket.r32'),
  r16: t('bracket.r16'),
  qf: t('bracket.qf'),
  sf: t('bracket.sf'),
  final: t('bracket.final'),
  third: t('bracket.third'),
}))

const ko = computed(() => props.matches.filter((m) => m.stage === 'knockout'))

/** Colonnes = tours présents, ordonnés ; petite finale traitée à part. */
const columns = computed(() => {
  const present = new Set(ko.value.map((m) => m.bracketRound))
  return ROUND_ORDER.filter((r) => present.has(r)).map((round) => ({
    round,
    label: ROUND_LABEL.value[round] ?? round,
    matches: ko.value
      .filter((m) => m.bracketRound === round)
      .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0)),
  }))
})

const third = computed(() => ko.value.find((m) => m.bracketRound === 'third') ?? null)

/** Classement final (podium 1er/2e/3e/4e) dérivé de la finale + petite finale (#106). */
const podium = computed(() => finalRanking(ko.value))

/** Fond de médaille pour la lisibilité de loin (or / argent / bronze). */
function medalClass(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-900'
  if (rank === 2) return 'bg-sand-4 text-sand-12'
  if (rank === 3) return 'bg-orange-100 text-orange-900'
  return 'bg-sand-3 text-sand-11'
}

function isPlayed(m: ResultMatchRow) {
  return m.homeScore !== null && m.awayScore !== null
}

/** Côté vainqueur ('home' | 'away') pour la mise en avant, ou null. */
function winnerSide(m: ResultMatchRow): 'home' | 'away' | null {
  if (!isPlayed(m)) return null
  if ((m.homeScore as number) > (m.awayScore as number)) return 'home'
  if ((m.awayScore as number) > (m.homeScore as number)) return 'away'
  return m.shootoutWinnerSide // nul départagé aux tirs au but (#105)
}

/** Le match a-t-il été départagé aux tirs au but (nul au score) ? */
function isShootout(m: ResultMatchRow): boolean {
  return isPlayed(m) && m.homeScore === m.awayScore && m.shootoutWinnerSide !== null
}

const teamName = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeTeam : m.awayTeam
const teamScore = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeScore : m.awayScore
</script>

<template>
  <DoubleEliminationBracket v-if="isDoubleElimination" :matches="matches" />

  <div v-else-if="ko.length">
    <!-- Classement final (podium) une fois la finale jouée (issue #106). -->
    <div v-if="podium.length" class="mb-5">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-9">
        {{ t('bracket.finalRanking') }}
      </h3>
      <ol class="flex flex-wrap gap-2">
        <li
          v-for="row in podium"
          :key="row.rank"
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold sm:text-base"
          :class="medalClass(row.rank)"
        >
          <span class="tabular-nums">{{ ordinalFr(row.rank) }}</span>
          <span>{{ row.teamName }}</span>
        </li>
      </ol>
    </div>

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
              class="rounded-lg border border-sand-6 bg-surface"
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
                <span v-if="isPlayed(m)" class="shrink-0 tabular-nums">{{
                  teamScore(m, side)
                }}</span>
              </div>
              <div
                v-if="isShootout(m)"
                class="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sand-9"
              >
                {{ t('bracket.shootout') }}
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
      <div class="max-w-xs rounded-lg border border-sand-6 bg-surface">
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
        <div
          v-if="isShootout(third)"
          class="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sand-9"
        >
          {{ t('bracket.shootout') }}
        </div>
      </div>
    </div>
  </div>

  <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-sm text-sand-11">
    {{ t('bracket.emptyKnockout') }}
  </p>
</template>
