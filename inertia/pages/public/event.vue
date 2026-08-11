<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import StandingsTable from '~/components/StandingsTable.vue'
import PoolStandings from '~/components/PoolStandings.vue'
import Bracket from '~/components/Bracket.vue'
import { useLiveEvent } from '~/composables/use_live_event'
import { useI18n } from '~/composables/i18n'
import type { PublicEventCategory, TournamentStatus } from '~/app/types'

const { t } = useI18n()

/**
 * Écran public d'un **événement** multi-catégories (#32, cf. CLAUDE.md §5) — double
 * contexte TV/vidéoprojecteur ET mobile. Onglets pour **naviguer entre catégories**,
 * chacune montrant son planning + classement en direct. Auto-refresh via SSE (un
 * canal par catégorie), aucune interaction requise.
 */
const props = defineProps<{
  event: {
    name: string
    eventDate: string | null
    status: TournamentStatus
    publicSlug: string
  }
  categories: PublicEventCategory[]
}>()

/** État live par catégorie, ré-hydraté depuis le serveur et mis à jour par SSE. */
const liveCategories = ref<PublicEventCategory[]>(props.categories)
watch(
  () => props.categories,
  (v) => (liveCategories.value = v)
)

const activeId = ref<number | null>(props.categories[0]?.id ?? null)
const active = computed(() => liveCategories.value.find((c) => c.id === activeId.value) ?? null)

const showPools = computed(
  () => active.value?.format === 'pools' || active.value?.format === 'hybrid'
)
const showBracket = computed(
  () =>
    active.value?.format === 'knockout' ||
    active.value?.format === 'hybrid' ||
    active.value?.format === 'double_elimination'
)

/** Route chaque mise à jour SSE vers la catégorie correspondant à son canal. */
const { state: liveState } = useLiveEvent(
  props.categories.map((c) => c.publicSlug),
  (slug, update) => {
    const cat = liveCategories.value.find((c) => c.publicSlug === slug)
    if (!cat) return
    cat.matches = update.matches
    cat.standings = update.standings
    cat.pools = update.pools
  }
)

/** Matchs de la catégorie active, regroupés par créneau horaire. */
const slots = computed(() => {
  if (!active.value) return []
  const byTime = new Map<string, PublicEventCategory['matches']>()
  for (const m of active.value.matches) {
    const bucket = byTime.get(m.time) ?? []
    bucket.push(m)
    byTime.set(m.time, bucket)
  }
  return [...byTime.entries()].map(([time, matches]) => ({ time, matches }))
})

const hasResults = computed(() => (active.value?.standings ?? []).some((r) => r.played > 0))

const statusLabel = computed<Record<TournamentStatus, string>>(() => ({
  draft: t('publicEvent.status.upcoming'),
  scheduled: t('publicEvent.status.upcoming'),
  live: t('publicEvent.status.live'),
  finished: t('publicEvent.status.finished'),
}))

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function isFinished(m: PublicEventCategory['matches'][number]) {
  return m.homeScore !== null && m.awayScore !== null
}

function forfeitTeamName(m: PublicEventCategory['matches'][number]) {
  if (m.forfeitSide === 'home') return m.homeTeam
  if (m.forfeitSide === 'away') return m.awayTeam
  return null
}
</script>

<template>
  <Head :title="t('publicEvent.headTitle', { name: event.name })" />

  <div class="min-h-screen bg-sand-1 text-sand-12">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <!-- En-tête -->
      <header class="mb-6 border-b border-sand-6 pb-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {{ event.name }}
            </h1>
            <p v-if="event.eventDate" class="mt-1 text-base text-sand-11 sm:text-lg">
              {{ formatDate(event.eventDate) }}
            </p>
          </div>
          <span
            v-if="liveState === 'connected'"
            class="flex items-center gap-1.5 text-xs font-medium text-sand-10"
          >
            <span class="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            {{ t('publicEvent.autoUpdate') }}
          </span>
        </div>
      </header>

      <!-- État vide -->
      <p
        v-if="liveCategories.length === 0"
        class="rounded-xl bg-sand-2 px-4 py-10 text-center text-base text-sand-11"
      >
        {{ t('publicEvent.emptyCategories') }}
      </p>

      <template v-else>
        <!-- Navigation entre catégories -->
        <nav class="mb-6 flex flex-wrap gap-2" :aria-label="t('publicEvent.categoriesNav')">
          <button
            v-for="c in liveCategories"
            :key="c.id"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-bold transition sm:text-base"
            :class="
              activeId === c.id
                ? 'bg-primary text-white'
                : 'bg-sand-3 text-sand-11 hover:bg-sand-4 hover:text-sand-12'
            "
            :aria-pressed="activeId === c.id"
            @click="activeId = c.id"
          >
            {{ c.name }}
          </button>
        </nav>

        <template v-if="active">
          <div class="mb-6 flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-bold sm:text-3xl">{{ active.category }}</h2>
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide"
              :class="
                active.status === 'live'
                  ? 'bg-primary text-white'
                  : active.status === 'finished'
                    ? 'bg-sand-4 text-sand-11'
                    : 'bg-sand-3 text-sand-11'
              "
            >
              <span
                v-if="active.status === 'live'"
                class="h-2.5 w-2.5 animate-pulse rounded-full bg-white"
                aria-hidden="true"
              />
              {{ statusLabel[active.status] }}
            </span>
            <a
              :href="`/t/${active.publicSlug}`"
              class="ml-auto text-sm font-medium text-primary hover:underline"
            >
              {{ t('publicEvent.fullscreenLink') }}
            </a>
          </div>

          <!-- Tableau d'élimination (pleine largeur, mis en avant pour l'affichage TV) -->
          <section v-if="showBracket" class="mb-8">
            <h3 class="mb-4 text-xl font-bold sm:text-2xl">{{ t('publicEvent.finalBracket') }}</h3>
            <Bracket :matches="active.matches" />
          </section>

          <div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <!-- Classement -->
            <section class="lg:col-span-3">
              <h3 class="mb-4 text-xl font-bold sm:text-2xl">
                {{ showPools ? t('publicEvent.poolStandings') : t('publicEvent.standings') }}
              </h3>
              <PoolStandings v-if="showPools" :pools="active.pools" />
              <p
                v-else-if="showBracket"
                class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11"
              >
                {{ t('publicEvent.bracketAbove') }}
              </p>
              <StandingsTable v-else-if="hasResults" :standings="active.standings" />
              <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11">
                {{ t('publicEvent.standingsPending') }}
              </p>
            </section>

            <!-- Matchs -->
            <section class="lg:col-span-2">
              <h3 class="mb-4 text-xl font-bold sm:text-2xl">{{ t('publicEvent.matches') }}</h3>
              <div v-if="slots.length" class="space-y-5">
                <div v-for="slot in slots" :key="slot.time">
                  <div class="mb-1.5 text-sm font-bold uppercase tracking-wide text-sand-9">
                    {{ slot.time }}
                  </div>
                  <ul class="space-y-1.5">
                    <li
                      v-for="m in slot.matches"
                      :key="m.id"
                      class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-base sm:text-lg"
                      :class="
                        isFinished(m) ? 'bg-sand-2' : 'bg-sand-1 ring-1 ring-inset ring-sand-4'
                      "
                    >
                      <span class="w-7 shrink-0 text-center text-xs font-medium text-sand-9">
                        {{ t('publicEvent.pitchShort', { n: m.terrainNumber }) }}
                      </span>
                      <span class="min-w-0 flex-1 truncate text-right font-medium">
                        {{ m.homeTeam }}
                      </span>
                      <span
                        class="shrink-0 rounded-md px-2 py-0.5 text-center font-bold tabular-nums"
                        :class="isFinished(m) ? 'bg-sand-12 text-sand-1' : 'text-sand-9'"
                      >
                        <template v-if="isFinished(m)">
                          {{ m.homeScore }} – {{ m.awayScore }}
                        </template>
                        <template v-else>{{ t('publicEvent.vs') }}</template>
                      </span>
                      <span class="min-w-0 flex-1 truncate font-medium">{{ m.awayTeam }}</span>
                      <span
                        v-if="m.status === 'forfeit'"
                        class="w-full text-right text-xs font-semibold uppercase tracking-wide text-amber-700"
                      >
                        {{ t('publicEvent.forfeit')
                        }}<span v-if="forfeitTeamName(m)"> — {{ forfeitTeamName(m) }}</span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11">
                {{ t('publicEvent.schedulePending') }}
              </p>
            </section>
          </div>
        </template>
      </template>

      <footer class="mt-10 border-t border-sand-6 pt-4 text-center text-xs text-sand-9">
        {{ t('publicEvent.footer') }}
      </footer>
    </div>
  </div>
</template>
