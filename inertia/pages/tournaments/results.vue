<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StandingsTable from '~/components/StandingsTable.vue'
import PoolStandings from '~/components/PoolStandings.vue'
import Bracket from '~/components/Bracket.vue'
import MatchScoreRow from '~/components/MatchScoreRow.vue'
import { useLiveTournament } from '~/composables/use_live_tournament'
import type { ResultMatchRow, StandingRow, PoolStanding, Tournament } from '~/app/types'

const props = defineProps<{
  tournament: Tournament
  matches: ResultMatchRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
}>()

const showBracket = computed(
  () => props.tournament.format === 'knockout' || props.tournament.format === 'hybrid'
)
const showPools = computed(
  () => props.tournament.format === 'pools' || props.tournament.format === 'hybrid'
)
const sideTitle = computed(() =>
  showPools.value ? 'Classements par poule' : showBracket.value ? 'Tableau' : 'Classement'
)

const showHref = `/tournaments/${props.tournament.id}`
// Export imprimable du classement final (issue #38) — page autonome, nouvel onglet.
const standingsPdfHref = `/tournaments/${props.tournament.id}/export/standings`

/**
 * État affiché, initialisé depuis le rendu serveur puis mis à jour :
 *  - en direct par le payload SSE (scores + classement déjà calculés) — aucun
 *    aller-retour serveur par abonné (cf. audit perf #1) ;
 *  - par les props quand le serveur renvoie un nouveau rendu (navigation, ou score
 *    saisi par l'organisateur courant → redirection Inertia).
 */
const liveMatches = ref<ResultMatchRow[]>(props.matches)
const liveStandings = ref<StandingRow[]>(props.standings)
const livePools = ref<PoolStanding[]>(props.pools)
watch(
  () => props.matches,
  (v) => (liveMatches.value = v)
)
watch(
  () => props.standings,
  (v) => (liveStandings.value = v)
)
watch(
  () => props.pools,
  (v) => (livePools.value = v)
)

/** Regroupe les matchs par créneau horaire pour la grille. */
const slots = computed(() => {
  const byTime = new Map<string, ResultMatchRow[]>()
  for (const m of liveMatches.value) {
    const bucket = byTime.get(m.time) ?? []
    bucket.push(m)
    byTime.set(m.time, bucket)
  }
  return [...byTime.entries()].map(([time, matches]) => ({ time, matches }))
})

const hasResults = computed(() => liveStandings.value.some((r) => r.played > 0))

/**
 * Temps réel : à chaque maj poussée par le serveur (score, forfait, décalage), on
 * applique directement le payload SSE — pas de rechargement, donc pas d'aller-retour
 * serveur par abonné. Sans SSE, la page reste fonctionnelle (dégradation gracieuse) :
 * seul le rafraîchissement auto est perdu. La saisie en cours est protégée par le
 * garde `isDirty` de chaque ligne (MatchScoreRow).
 */
const { state: liveState } = useLiveTournament(props.tournament.publicSlug, (update) => {
  liveMatches.value = update.matches
  liveStandings.value = update.standings
  livePools.value = update.pools
})

const live = computed(() => {
  switch (liveState.value) {
    case 'connected':
      return { label: 'En direct', dot: 'bg-primary', text: 'text-primary-800' }
    case 'connecting':
      return { label: 'Connexion…', dot: 'bg-amber-400', text: 'text-sand-11' }
    default:
      return { label: 'Hors ligne', dot: 'bg-sand-8', text: 'text-sand-10' }
  }
})
</script>

<template>
  <Head :title="`Résultats — ${tournament.name}`" />

  <AdminLayout>
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link :href="showHref" class="text-sm text-sand-11 hover:text-sand-12">
          ← {{ tournament.name }}
        </Link>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Saisie des résultats</h1>
        <p class="mt-1 text-sand-11">
          Saisissez les scores au fil des matchs — le classement se met à jour aussitôt.
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <!-- Export imprimable du classement final (jour J). -->
        <a
          :href="standingsPdfHref"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          Classement (PDF) ↗
        </a>
        <!-- Lien vers l'écran public (lecture seule) à projeter / partager aux équipes. -->
        <a
          :href="`/t/${tournament.publicSlug}`"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          Écran public ↗
        </a>
      </div>
    </div>

    <!-- Pas de planning : rien à saisir -->
    <div
      v-if="liveMatches.length === 0"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">Aucun match : générez d'abord le planning.</p>
      <Link
        :href="`/tournaments/${tournament.id}/planning`"
        class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-700"
      >
        Générer le planning
      </Link>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Grille de saisie -->
      <section class="rounded-2xl border border-sand-6 bg-white p-6 lg:col-span-2">
        <h2 class="mb-4 text-base font-semibold text-sand-12">Scores</h2>
        <div class="space-y-5">
          <div v-for="slot in slots" :key="slot.time">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-sand-9">
              {{ slot.time }}
            </div>
            <div class="divide-y divide-sand-4">
              <MatchScoreRow
                v-for="match in slot.matches"
                :key="match.id"
                :match="match"
                :tournament-id="tournament.id"
                :num-terrains="tournament.numTerrains"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Classement en direct -->
      <section
        class="rounded-2xl border border-sand-6 bg-white p-6 lg:sticky lg:top-6 lg:self-start"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-sand-12">{{ sideTitle }}</h2>
          <!-- Indicateur temps réel : visualise aussi la dégradation gracieuse. -->
          <span
            class="inline-flex items-center gap-1.5 text-xs font-medium"
            :class="live.text"
            :title="
              liveState === 'connected'
                ? 'Mises à jour poussées en direct'
                : 'Temps réel indisponible — la page reste fonctionnelle, rechargez pour la dernière version'
            "
          >
            <span class="h-2 w-2 rounded-full" :class="live.dot" aria-hidden="true" />
            {{ live.label }}
          </span>
        </div>
        <!-- Poules / hybride : classements par poule. -->
        <PoolStandings v-if="showPools" :pools="livePools" />
        <!-- Élimination directe : le tableau est affiché en pleine largeur ci-dessous. -->
        <p
          v-else-if="showBracket"
          class="rounded-md bg-sand-2 px-3 py-4 text-center text-sm text-sand-11"
        >
          Le tableau final est affiché ci-dessous ↓
        </p>
        <!-- Championnat : classement global. -->
        <StandingsTable v-else-if="hasResults" :standings="liveStandings" />
        <p v-else class="rounded-md bg-sand-2 px-3 py-4 text-center text-sm text-sand-11">
          Le classement s'affichera dès le premier score saisi.
        </p>
      </section>
    </div>

    <!-- Tableau d'élimination (pleine largeur) -->
    <section
      v-if="showBracket && liveMatches.length"
      class="mt-6 rounded-2xl border border-sand-6 bg-white p-6"
    >
      <h2 class="mb-4 text-base font-semibold text-sand-12">Tableau final</h2>
      <Bracket :matches="liveMatches" />
    </section>
  </AdminLayout>
</template>
