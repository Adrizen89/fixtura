<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import TeamsManager from '~/components/TeamsManager.vue'
import TeamsImport from '~/components/TeamsImport.vue'
import RegistrationManager from '~/components/RegistrationManager.vue'
import PlanningGrid from '~/components/PlanningGrid.vue'
import type { PlanningView, Tournament } from '~/app/types'

const props = defineProps<{ tournament: Tournament; planning: PlanningView | null }>()

const teams = computed(() => props.tournament.teams ?? [])
const canGenerate = computed(() => teams.value.length >= 2)
const planningHref = `/tournaments/${props.tournament.id}/planning`
const resultsHref = `/tournaments/${props.tournament.id}/results`
// Exports imprimables (issue #38) — pages autonomes, ouvertes dans un nouvel onglet.
const planningPdfHref = `/tournaments/${props.tournament.id}/export/planning`
const matchSheetsPdfHref = `/tournaments/${props.tournament.id}/export/match-sheets`
// Écran public + QR code (issue #40).
const publicHref = `/t/${props.tournament.publicSlug}`
const tvHref = `/t/${props.tournament.publicSlug}?tv=1`
const qrHref = `/tournaments/${props.tournament.id}/qrcode`

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function hhmm(v: string | null) {
  return v ? v.slice(0, 5) : '—'
}
</script>

<template>
  <Head :title="tournament.name" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/tournaments" class="text-sm text-sand-11 hover:text-sand-12">← Tournois</Link>
      <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ tournament.name }}</h1>
          <StatusBadge :status="tournament.status" />
        </div>
        <div class="flex items-center gap-2">
          <Link
            :href="`/tournaments/${tournament.id}/edit`"
            class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          >
            Modifier
          </Link>
        </div>
      </div>
      <p class="mt-1 text-sand-11">
        {{ tournament.category }} · {{ formatDate(tournament.eventDate) }}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Paramètres -->
      <section class="rounded-2xl border border-sand-6 bg-white p-6 lg:col-span-2">
        <h2 class="mb-4 text-base font-semibold text-sand-12">Paramètres</h2>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Heure de début</dt>
            <dd class="mt-0.5 text-sand-12">{{ hhmm(tournament.startTime) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Terrains</dt>
            <dd class="mt-0.5 text-sand-12">{{ tournament.numTerrains }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Durée d'un match</dt>
            <dd class="mt-0.5 text-sand-12">{{ tournament.matchDurationMin }} min</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Pause entre matchs</dt>
            <dd class="mt-0.5 text-sand-12">{{ tournament.breakDurationMin }} min</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Pause déjeuner</dt>
            <dd class="mt-0.5 text-sand-12">
              <template v-if="tournament.lunchStart">
                {{ hhmm(tournament.lunchStart) }} ({{ tournament.lunchDurationMin }} min)
              </template>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Équipes -->
      <TeamsManager :tournament-id="tournament.id" :teams="teams" />

      <!-- Import CSV / Excel d'une liste d'équipes (#120) -->
      <TeamsImport :tournament-id="tournament.id" />
    </div>

    <!-- Écran public : lien, mode TV et QR code à afficher au bord des terrains (#40) -->
    <section class="mt-6 rounded-2xl border border-sand-6 bg-white p-6">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div class="flex shrink-0 justify-center">
          <img
            :src="qrHref"
            alt="QR code vers l'écran public du tournoi"
            width="150"
            height="150"
            class="h-[150px] w-[150px] rounded-lg border border-sand-6"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-sand-12">Écran public</h2>
          <p class="mt-0.5 text-sm text-sand-11">
            Partagez ce QR code aux équipes ou affichez-le au bord des terrains : il ouvre le
            classement et le planning en direct, en lecture seule.
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a
              :href="publicHref"
              target="_blank"
              rel="noopener"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Ouvrir l'écran public ↗
            </a>
            <a
              :href="tvHref"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
            >
              Mode TV ↗
            </a>
            <a
              :href="qrHref"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
            >
              QR code (SVG) ↗
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Inscriptions en ligne des équipes (#112) -->
    <RegistrationManager class="mt-6" :tournament="tournament" />

    <!-- Planning -->
    <section class="mt-6 rounded-2xl border border-sand-6 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-sand-12">Planning</h2>
          <p v-if="planning" class="mt-0.5 text-sm text-sand-11">
            {{ planning.matchCount }} matchs · {{ planning.roundsCount }} journées ·
            {{ planning.startTime }}–{{ planning.endTime }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Link
            v-if="planning"
            :href="resultsHref"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Saisir les résultats
          </Link>
          <Link
            v-if="canGenerate"
            :href="planningHref"
            :class="
              planning
                ? 'rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12'
                : 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700'
            "
          >
            {{ planning ? 'Régénérer le planning' : 'Générer le planning' }}
          </Link>
        </div>
      </div>

      <!-- Exports imprimables (jour J) : planning + feuilles de match. -->
      <div
        v-if="planning"
        class="mb-4 flex flex-wrap items-center gap-2 border-b border-sand-4 pb-4"
      >
        <span class="mr-1 text-xs font-semibold uppercase tracking-wide text-sand-9">Imprimer</span>
        <a
          :href="planningPdfHref"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          Planning (PDF) ↗
        </a>
        <a
          :href="matchSheetsPdfHref"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          Feuilles de match (PDF) ↗
        </a>
      </div>

      <!-- Planning persisté -->
      <PlanningGrid v-if="planning" :slots="planning.slots" show-scores />

      <!-- Pas encore de planning -->
      <div v-else class="rounded-lg border border-dashed border-sand-7 px-4 py-8 text-center">
        <p v-if="!canGenerate" class="text-sm text-sand-11">
          Ajoutez au moins 2 équipes pour générer le planning.
        </p>
        <template v-else>
          <p class="text-sm text-sand-11">Aucun planning généré pour l'instant.</p>
          <Link
            :href="planningHref"
            class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Générer le planning
          </Link>
        </template>
      </div>
    </section>
  </AdminLayout>
</template>
