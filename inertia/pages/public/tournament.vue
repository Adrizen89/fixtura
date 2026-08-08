<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import Bracket from '~/components/Bracket.vue'
import PoolStandings from '~/components/PoolStandings.vue'
import TeamFollow from '~/components/TeamFollow.vue'
import TvBoard from '~/components/TvBoard.vue'
import { useLiveTournament } from '~/composables/use_live_tournament'
import type {
  ResultMatchRow,
  StandingRow,
  PoolStanding,
  PublicClub,
  TournamentStatus,
  TournamentFormat,
} from '~/app/types'

/**
 * Écran public d'un tournoi (cf. CLAUDE.md §5) — double contexte : projeté sur
 * TV/vidéoprojecteur ET consulté sur mobile. Gros contrastes, grandes typos,
 * lecture seule, auto-refresh via SSE (aucune interaction requise).
 */
const props = defineProps<{
  tournament: {
    name: string
    category: string
    eventDate: string | null
    status: TournamentStatus
    publicSlug: string
    format: TournamentFormat
  }
  club: PublicClub
  tv: boolean
  matches: ResultMatchRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
}>()

/**
 * Personnalisation du club (#40) : on surcharge les variables CSS de la couleur
 * primaire sur la racine de l'écran public. Tailwind v4 exposant ses couleurs de
 * thème via `var(--color-…)`, cette surcharge se propage aux utilitaires `primary`
 * de toute la page. `color-mix` dérive les nuances ; navigateurs sans support →
 * repli sur la palette verte par défaut (dégradation gracieuse).
 */
const brandStyle = computed(() => {
  const c = props.club.primaryColor
  if (!c) return {}
  return {
    '--color-primary': c,
    '--color-primary-50': `color-mix(in srgb, ${c} 8%, white)`,
    '--color-primary-100': `color-mix(in srgb, ${c} 16%, white)`,
    '--color-primary-200': `color-mix(in srgb, ${c} 28%, white)`,
    '--color-primary-700': `color-mix(in srgb, ${c} 82%, black)`,
    '--color-primary-800': `color-mix(in srgb, ${c} 68%, black)`,
  }
})

const accent = computed(() => props.club.primaryColor || '#16a34a')

const showBracket = computed(
  () => props.tournament.format === 'knockout' || props.tournament.format === 'hybrid'
)
const showPools = computed(
  () => props.tournament.format === 'pools' || props.tournament.format === 'hybrid'
)
const sideTitle = computed(() => (showPools.value ? 'Classements par poule' : 'Classement'))

/**
 * État affiché, initialisé depuis le rendu serveur puis mis à jour en direct par le
 * payload SSE (scores + classement déjà calculés) — aucun aller-retour serveur par
 * abonné (cf. audit perf #1). Les props re-seedent l'état sur un nouveau rendu serveur.
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

/**
 * Auto-refresh : à chaque score/forfait/décalage, le serveur diffuse le nouvel état
 * sur le canal du tournoi → on l'applique directement (pas de polling, pas de
 * rechargement). Sans SSE, la page reste lisible (dégradation gracieuse), figée sur
 * le dernier rendu serveur.
 */
const { state: liveState } = useLiveTournament(props.tournament.publicSlug, (update) => {
  liveMatches.value = update.matches
  liveStandings.value = update.standings
  livePools.value = update.pools
})

/** Matchs regroupés par créneau horaire. */
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
 * Liste des équipes du tournoi (id + nom), pour le sélecteur de suivi d'équipe (#39).
 * Le classement global inclut **toutes** les équipes (même à 0 match), quel que soit
 * le format — c'est donc la source fiable pour peupler le sélecteur.
 */
const allTeams = computed(() =>
  liveStandings.value.map((r) => ({ id: r.teamId, name: r.teamName }))
)

const statusLabel: Record<TournamentStatus, string> = {
  draft: 'À venir',
  scheduled: 'À venir',
  live: 'En direct',
  finished: 'Terminé',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function isFinished(m: ResultMatchRow) {
  return m.homeScore !== null && m.awayScore !== null
}

/** Nom de l'équipe forfaitaire d'un match, ou null si ce n'est pas un forfait. */
function forfeitTeamName(m: ResultMatchRow) {
  if (m.forfeitSide === 'home') return m.homeTeam
  if (m.forfeitSide === 'away') return m.awayTeam
  return null
}

/** Classe de fond du podium (3 premiers) pour la lisibilité de loin. */
function rowClass(rank: number) {
  if (rank === 1) return 'bg-primary-100'
  if (rank <= 3) return 'bg-primary-50'
  return ''
}
</script>

<template>
  <Head :title="`${tournament.name} — en direct`" />

  <!-- Mode TV : affichage plein écran en rotation, très gros contrastes (#40). -->
  <TvBoard
    v-if="tv"
    :tournament="{
      name: tournament.name,
      category: tournament.category,
      status: tournament.status,
      format: tournament.format,
    }"
    :club="club"
    :matches="liveMatches"
    :standings="liveStandings"
    :pools="livePools"
    :live-state="liveState"
  />

  <div v-else class="min-h-screen bg-sand-1 text-sand-12" :style="brandStyle">
    <!-- Bandeau d'accent aux couleurs du club. -->
    <div class="h-1.5 w-full" :style="{ backgroundColor: accent }" />
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <!-- En-tête -->
      <header class="mb-8 border-b border-sand-6 pb-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-center gap-4">
            <img
              v-if="club.logo"
              :src="club.logo"
              alt=""
              class="h-14 w-14 shrink-0 rounded-xl object-contain sm:h-16 sm:w-16"
            />
            <div>
              <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {{ tournament.name }}
              </h1>
              <p class="mt-1 text-base text-sand-11 sm:text-lg">
                {{ tournament.category
                }}<span v-if="tournament.eventDate"> · {{ formatDate(tournament.eventDate) }}</span>
              </p>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide sm:text-base"
              :class="
                tournament.status === 'live'
                  ? 'bg-primary text-white'
                  : tournament.status === 'finished'
                    ? 'bg-sand-4 text-sand-11'
                    : 'bg-sand-3 text-sand-11'
              "
            >
              <span
                v-if="tournament.status === 'live'"
                class="h-2.5 w-2.5 animate-pulse rounded-full bg-white"
                aria-hidden="true"
              />
              {{ statusLabel[tournament.status] }}
            </span>
            <span
              v-if="liveState === 'connected'"
              class="flex items-center gap-1.5 text-xs font-medium text-sand-10"
            >
              <span class="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              Mise à jour automatique
            </span>
          </div>
        </div>
      </header>

      <!-- Suivi d'équipe : prochain match + alertes en direct (#39) -->
      <TeamFollow
        v-if="allTeams.length"
        :public-slug="tournament.publicSlug"
        :teams="allTeams"
        :matches="liveMatches"
      />

      <!-- Tableau d'élimination (pleine largeur, mis en avant pour l'affichage TV) -->
      <section v-if="showBracket" class="mb-8">
        <h2 class="mb-4 text-xl font-bold sm:text-2xl">Tableau final</h2>
        <Bracket :matches="liveMatches" />
      </section>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <!-- Classement (mis en avant) -->
        <section class="lg:col-span-3">
          <h2 class="mb-4 text-xl font-bold sm:text-2xl">{{ sideTitle }}</h2>

          <PoolStandings v-if="showPools" :pools="livePools" />
          <p
            v-else-if="showBracket"
            class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11"
          >
            Le tableau final est affiché ci-dessus.
          </p>
          <div v-else-if="hasResults" class="overflow-x-auto">
            <table class="w-full border-collapse">
              <caption class="sr-only">
                Classement en direct : rang, équipe, matchs joués, gagnés, nuls, perdus, différence
                de buts et points.
              </caption>
              <thead>
                <tr
                  class="border-b-2 border-sand-7 text-left text-xs uppercase tracking-wide text-sand-10 sm:text-sm"
                >
                  <th scope="col" class="py-2 pr-2 font-semibold">#</th>
                  <th scope="col" class="py-2 pr-3 font-semibold">Équipe</th>
                  <th scope="col" class="py-2 px-1.5 text-center font-semibold" title="Joués">
                    J<span class="sr-only"> — matchs joués</span>
                  </th>
                  <th
                    scope="col"
                    class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell"
                    title="Gagnés"
                  >
                    G<span class="sr-only"> — gagnés</span>
                  </th>
                  <th
                    scope="col"
                    class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell"
                    title="Nuls"
                  >
                    N<span class="sr-only"> — nuls</span>
                  </th>
                  <th
                    scope="col"
                    class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell"
                    title="Perdus"
                  >
                    P<span class="sr-only"> — perdus</span>
                  </th>
                  <th
                    scope="col"
                    class="py-2 px-1.5 text-center font-semibold"
                    title="Différence de buts"
                  >
                    Diff<span class="sr-only"> — différence de buts</span>
                  </th>
                  <th scope="col" class="py-2 pl-2 text-center font-bold" title="Points">
                    Pts<span class="sr-only"> — points</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in liveStandings"
                  :key="row.teamId"
                  class="border-b border-sand-5 text-base sm:text-lg"
                  :class="rowClass(row.rank)"
                >
                  <td class="py-3 pr-2 text-center align-middle">
                    <span
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold sm:h-8 sm:w-8 sm:text-base"
                      :class="row.rank <= 3 ? 'bg-primary text-white' : 'bg-sand-3 text-sand-11'"
                    >
                      {{ row.rank }}
                    </span>
                  </td>
                  <th scope="row" class="py-3 pr-3 text-left font-semibold">{{ row.teamName }}</th>
                  <td class="py-3 px-1.5 text-center tabular-nums text-sand-11">
                    {{ row.played }}
                  </td>
                  <td
                    class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell"
                  >
                    {{ row.won }}
                  </td>
                  <td
                    class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell"
                  >
                    {{ row.drawn }}
                  </td>
                  <td
                    class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell"
                  >
                    {{ row.lost }}
                  </td>
                  <td class="py-3 px-1.5 text-center tabular-nums text-sand-11">
                    {{ row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference }}
                  </td>
                  <td
                    class="py-3 pl-2 text-center text-xl font-extrabold tabular-nums text-primary-800 sm:text-2xl"
                  >
                    {{ row.points }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11">
            Le classement s'affichera dès le premier score.
          </p>
        </section>

        <!-- Résultats / planning -->
        <section class="lg:col-span-2">
          <h2 class="mb-4 text-xl font-bold sm:text-2xl">Matchs</h2>

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
                  :class="isFinished(m) ? 'bg-sand-2' : 'bg-sand-1 ring-1 ring-inset ring-sand-4'"
                >
                  <span class="w-7 shrink-0 text-center text-xs font-medium text-sand-9">
                    T{{ m.terrainNumber }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-right font-medium">{{
                    m.homeTeam
                  }}</span>
                  <span
                    class="shrink-0 rounded-md px-2 py-0.5 text-center font-bold tabular-nums"
                    :class="isFinished(m) ? 'bg-sand-12 text-sand-1' : 'text-sand-9'"
                  >
                    <template v-if="isFinished(m)">{{ m.homeScore }} – {{ m.awayScore }}</template>
                    <template v-else>vs</template>
                  </span>
                  <span class="min-w-0 flex-1 truncate font-medium">{{ m.awayTeam }}</span>
                  <span
                    v-if="m.status === 'forfeit'"
                    class="w-full text-right text-xs font-semibold uppercase tracking-wide text-amber-700"
                  >
                    Forfait<span v-if="forfeitTeamName(m)"> — {{ forfeitTeamName(m) }}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11">
            Le planning n'est pas encore publié.
          </p>
        </section>
      </div>

      <footer
        class="mt-10 flex flex-col items-center gap-2 border-t border-sand-6 pt-4 text-center text-xs text-sand-9"
      >
        <span>Fixtura · résultats en direct</span>
        <nav
          aria-label="Liens légaux"
          class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          <a href="/mentions-legales" class="hover:text-sand-12 hover:underline"
            >Mentions légales</a
          >
          <a href="/cgu" class="hover:text-sand-12 hover:underline">CGU</a>
          <a href="/confidentialite" class="hover:text-sand-12 hover:underline">Confidentialité</a>
        </nav>
      </footer>
    </div>
  </div>
</template>
