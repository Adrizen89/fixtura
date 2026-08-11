<script setup lang="ts">
import { computed } from 'vue'
import type { ResultMatchRow } from '~/app/types'
import { finalRanking, ordinalFr } from '~/composables/final_ranking'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

/**
 * Arbre de **double élimination** (issue #111) — lecture seule, sobre.
 * Trois sections en colonnes par tour : tableau principal (gagnants), repêchage,
 * et grande finale. Participants nommés (équipe connue ou libellé différé),
 * vainqueur mis en avant. Défilement horizontal sur mobile ; lisible de loin.
 */
const props = defineProps<{ matches: ResultMatchRow[] }>()

const sides = ['home', 'away'] as const

const ko = computed(() => props.matches.filter((m) => m.stage === 'knockout'))

interface Column {
  round: number
  label: string
  matches: ResultMatchRow[]
}

/** Colonnes d'un tableau (`wb-r*` ou `lb-r*`), ordonnées par tour ; dernier = finale. */
function bracketColumns(prefix: string, finalKey: string, roundKey: string): Column[] {
  const re = new RegExp(`^${prefix}(\\d+)$`)
  const byRound = new Map<number, ResultMatchRow[]>()
  for (const m of ko.value) {
    const found = re.exec(m.bracketRound ?? '')
    if (!found) continue
    const n = Number(found[1])
    const bucket = byRound.get(n) ?? []
    bucket.push(m)
    byRound.set(n, bucket)
  }
  const maxN = Math.max(0, ...byRound.keys())
  return [...byRound.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({
      round: n,
      label: n === maxN ? t(finalKey) : t(roundKey, { n }),
      matches: byRound.get(n)!.sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0)),
    }))
}

const winnersColumns = computed(() =>
  bracketColumns('wb-r', 'bracket.winnersFinal', 'bracket.winnersRound')
)
const losersColumns = computed(() =>
  bracketColumns('lb-r', 'bracket.losersFinal', 'bracket.losersRound')
)
const grandFinal = computed(() => ko.value.find((m) => m.bracketRound === 'gf') ?? null)

/** Classement final (podium) dérivé de la grande finale + finale du repêchage. */
const podium = computed(() => finalRanking(ko.value))

function medalClass(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-900'
  if (rank === 2) return 'bg-sand-4 text-sand-12'
  if (rank === 3) return 'bg-orange-100 text-orange-900'
  return 'bg-sand-3 text-sand-11'
}

function isPlayed(m: ResultMatchRow) {
  return m.homeScore !== null && m.awayScore !== null
}

function winnerSide(m: ResultMatchRow): 'home' | 'away' | null {
  if (!isPlayed(m)) return null
  if ((m.homeScore as number) > (m.awayScore as number)) return 'home'
  if ((m.awayScore as number) > (m.homeScore as number)) return 'away'
  return m.shootoutWinnerSide // nul départagé aux tirs au but (#105)
}

function isShootout(m: ResultMatchRow): boolean {
  return isPlayed(m) && m.homeScore === m.awayScore && m.shootoutWinnerSide !== null
}

const teamName = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeTeam : m.awayTeam
const teamScore = (m: ResultMatchRow, side: 'home' | 'away') =>
  side === 'home' ? m.homeScore : m.awayScore
</script>

<template>
  <div v-if="ko.length">
    <!-- Classement final (podium) une fois la grande finale jouée. -->
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

    <!-- Sections : tableau principal, repêchage, grande finale. -->
    <div
      v-for="section in [
        { key: 'wb', title: t('bracket.mainBracket'), columns: winnersColumns },
        { key: 'lb', title: t('bracket.losersBracket'), columns: losersColumns },
      ]"
      :key="section.key"
      class="mb-6"
    >
      <h3 class="mb-2 text-sm font-bold text-sand-12">{{ section.title }}</h3>
      <div class="overflow-x-auto pb-2">
        <div class="flex gap-4">
          <div
            v-for="col in section.columns"
            :key="col.round"
            class="flex min-w-[12rem] flex-1 flex-col gap-2"
          >
            <h4 class="text-xs font-semibold uppercase tracking-wide text-sand-9">
              {{ col.label }}
            </h4>
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
    </div>

    <!-- Grande finale -->
    <div v-if="grandFinal" class="border-t border-sand-5 pt-4">
      <h3 class="mb-2 text-sm font-bold text-sand-12">{{ t('bracket.grandFinal') }}</h3>
      <div class="max-w-xs rounded-lg border border-sand-6 bg-white">
        <div
          v-for="side in sides"
          :key="side"
          class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm sm:text-base"
          :class="[
            side === 'home' ? 'border-b border-sand-4' : '',
            winnerSide(grandFinal) === side ? 'font-bold text-sand-12' : 'text-sand-11',
          ]"
        >
          <span class="min-w-0 truncate">{{ teamName(grandFinal, side) }}</span>
          <span v-if="isPlayed(grandFinal)" class="shrink-0 tabular-nums">
            {{ teamScore(grandFinal, side) }}
          </span>
        </div>
        <div
          v-if="isShootout(grandFinal)"
          class="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sand-9"
        >
          {{ t('bracket.shootout') }}
        </div>
      </div>
    </div>
  </div>

  <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-sm text-sand-11">
    {{ t('bracket.emptyBracket') }}
  </p>
</template>
