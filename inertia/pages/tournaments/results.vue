<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StandingsTable from '~/components/StandingsTable.vue'
import MatchScoreRow from '~/components/MatchScoreRow.vue'
import { useLiveTournament } from '~/composables/use_live_tournament'
import type { ResultMatchRow, StandingRow, Tournament } from '~/app/types'

const props = defineProps<{
  tournament: Tournament
  matches: ResultMatchRow[]
  standings: StandingRow[]
}>()

const showHref = `/tournaments/${props.tournament.id}`

/** Regroupe les matchs par créneau horaire pour la grille. */
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

/**
 * Temps réel : dès qu'un organisateur enregistre un score, on recharge scores +
 * classement depuis le serveur (événementiel, pas de polling). preserveState
 * conserve la saisie en cours de l'utilisateur. Sans SSE, la page reste
 * fonctionnelle (dégradation gracieuse) — seul le rafraîchissement auto est perdu.
 */
const { state: liveState } = useLiveTournament(props.tournament.publicSlug, () => {
  router.reload({ only: ['matches', 'standings'], preserveScroll: true, preserveState: true })
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
    <div class="mb-6">
      <Link :href="showHref" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ tournament.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Saisie des résultats</h1>
      <p class="mt-1 text-sand-11">
        Saisissez les scores au fil des matchs — le classement se met à jour aussitôt.
      </p>
    </div>

    <!-- Pas de planning : rien à saisir -->
    <div
      v-if="matches.length === 0"
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
          <h2 class="text-base font-semibold text-sand-12">Classement</h2>
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
        <StandingsTable v-if="hasResults" :standings="standings" />
        <p v-else class="rounded-md bg-sand-2 px-3 py-4 text-center text-sm text-sand-11">
          Le classement s'affichera dès le premier score saisi.
        </p>
      </section>
    </div>
  </AdminLayout>
</template>
