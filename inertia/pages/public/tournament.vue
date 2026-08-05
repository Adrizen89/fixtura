<script setup lang="ts">
import { computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { useLiveTournament } from '~/composables/use_live_tournament'
import type { ResultMatchRow, StandingRow, TournamentStatus } from '~/app/types'

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
  }
  matches: ResultMatchRow[]
  standings: StandingRow[]
}>()

/**
 * Auto-refresh : à chaque score saisi côté organisateurs, le serveur diffuse sur
 * le canal du tournoi → on recharge scores + classement (événementiel, pas de
 * polling). Sans SSE, la page reste lisible (dégradation gracieuse), simplement
 * figée sur le dernier rendu serveur.
 */
const { state: liveState } = useLiveTournament(props.tournament.publicSlug, () => {
  router.reload({ only: ['matches', 'standings'], preserveScroll: true })
})

/** Matchs regroupés par créneau horaire. */
const slots = computed(() => {
  const byTime = new Map<string, ResultMatchRow[]>()
  for (const m of props.matches) {
    const bucket = byTime.get(m.time) ?? []
    bucket.push(m)
    byTime.set(m.time, bucket)
  }
  return [...byTime.entries()].map(([time, matches]) => ({ time, matches }))
})

const hasResults = computed(() => props.standings.some((r) => r.played > 0))

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

/** Classe de fond du podium (3 premiers) pour la lisibilité de loin. */
function rowClass(rank: number) {
  if (rank === 1) return 'bg-primary-100'
  if (rank <= 3) return 'bg-primary-50'
  return ''
}
</script>

<template>
  <Head :title="`${tournament.name} — en direct`" />

  <div class="min-h-screen bg-sand-1 text-sand-12">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <!-- En-tête -->
      <header class="mb-8 border-b border-sand-6 pb-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {{ tournament.name }}
            </h1>
            <p class="mt-1 text-base text-sand-11 sm:text-lg">
              {{ tournament.category }}<span v-if="tournament.eventDate"> · {{ formatDate(tournament.eventDate) }}</span>
            </p>
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

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <!-- Classement (mis en avant) -->
        <section class="lg:col-span-3">
          <h2 class="mb-4 text-xl font-bold sm:text-2xl">Classement</h2>

          <div v-if="hasResults" class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b-2 border-sand-7 text-left text-xs uppercase tracking-wide text-sand-10 sm:text-sm">
                  <th class="py-2 pr-2 font-semibold">#</th>
                  <th class="py-2 pr-3 font-semibold">Équipe</th>
                  <th class="py-2 px-1.5 text-center font-semibold" title="Joués">J</th>
                  <th class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell" title="Gagnés">G</th>
                  <th class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell" title="Nuls">N</th>
                  <th class="hidden py-2 px-1.5 text-center font-semibold sm:table-cell" title="Perdus">P</th>
                  <th class="py-2 px-1.5 text-center font-semibold" title="Différence de buts">Diff</th>
                  <th class="py-2 pl-2 text-center font-bold" title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in standings"
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
                  <td class="py-3 pr-3 font-semibold">{{ row.teamName }}</td>
                  <td class="py-3 px-1.5 text-center tabular-nums text-sand-11">{{ row.played }}</td>
                  <td class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell">
                    {{ row.won }}
                  </td>
                  <td class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell">
                    {{ row.drawn }}
                  </td>
                  <td class="hidden py-3 px-1.5 text-center tabular-nums text-sand-11 sm:table-cell">
                    {{ row.lost }}
                  </td>
                  <td class="py-3 px-1.5 text-center tabular-nums text-sand-11">
                    {{ row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference }}
                  </td>
                  <td class="py-3 pl-2 text-center text-xl font-extrabold tabular-nums text-primary-800 sm:text-2xl">
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
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-base sm:text-lg"
                  :class="isFinished(m) ? 'bg-sand-2' : 'bg-sand-1 ring-1 ring-inset ring-sand-4'"
                >
                  <span class="w-7 shrink-0 text-center text-xs font-medium text-sand-9">
                    T{{ m.terrainNumber }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-right font-medium">{{ m.homeTeam }}</span>
                  <span
                    class="shrink-0 rounded-md px-2 py-0.5 text-center font-bold tabular-nums"
                    :class="isFinished(m) ? 'bg-sand-12 text-sand-1' : 'text-sand-9'"
                  >
                    <template v-if="isFinished(m)">{{ m.homeScore }} – {{ m.awayScore }}</template>
                    <template v-else>vs</template>
                  </span>
                  <span class="min-w-0 flex-1 truncate font-medium">{{ m.awayTeam }}</span>
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="rounded-xl bg-sand-2 px-4 py-8 text-center text-base text-sand-11">
            Le planning n'est pas encore publié.
          </p>
        </section>
      </div>

      <footer class="mt-10 border-t border-sand-6 pt-4 text-center text-xs text-sand-9">
        Fixtura · résultats en direct
      </footer>
    </div>
  </div>
</template>
