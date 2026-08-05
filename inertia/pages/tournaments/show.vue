<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import TeamsManager from '~/components/TeamsManager.vue'
import type { Tournament } from '~/app/types'

const props = defineProps<{ tournament: Tournament }>()

const teams = computed(() => props.tournament.teams ?? [])

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
    </div>

    <!-- Planning (généré à l'étape suivante) -->
    <section class="mt-6 rounded-2xl border border-dashed border-sand-7 bg-white p-8 text-center">
      <p class="text-sand-11">
        La génération du planning et la saisie des résultats arrivent aux étapes suivantes.
      </p>
    </section>
  </AdminLayout>
</template>
