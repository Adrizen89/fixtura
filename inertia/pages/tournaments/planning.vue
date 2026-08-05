<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import PlanningGrid from '~/components/PlanningGrid.vue'
import type { PlanningView, Tournament } from '~/app/types'

const props = defineProps<{
  tournament: Tournament
  preview: PlanningView
  hasExistingPlanning: boolean
}>()

const showHref = `/tournaments/${props.tournament.id}`

function validate() {
  if (
    props.hasExistingPlanning &&
    !confirm('Cela remplacera le planning actuel (et les scores déjà saisis). Continuer ?')
  ) {
    return
  }
  router.post(`/tournaments/${props.tournament.id}/planning`)
}
</script>

<template>
  <Head :title="`Aperçu du planning — ${tournament.name}`" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="showHref" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ tournament.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Aperçu du planning</h1>
      <p class="mt-1 text-sand-11">
        Vérifiez le planning proposé, puis validez pour l'enregistrer. Rien n'est enregistré tant
        que vous n'avez pas validé.
      </p>
    </div>

    <!-- Avertissement régénération -->
    <div
      v-if="hasExistingPlanning"
      class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="alert"
    >
      Un planning existe déjà pour ce tournoi. Le valider remplacera le planning actuel ainsi que
      les scores éventuellement saisis.
    </div>

    <!-- Résumé -->
    <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">Matchs</dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.matchCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">Journées</dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.roundsCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">Créneaux</dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.slotsCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">Plage horaire</dt>
        <dd class="mt-0.5 text-xl font-semibold tabular-nums text-sand-12">
          {{ preview.startTime }}–{{ preview.endTime }}
        </dd>
      </div>
    </div>

    <!-- Grille -->
    <section class="rounded-2xl border border-sand-6 bg-white p-6">
      <PlanningGrid :slots="preview.slots" />
    </section>

    <!-- Actions -->
    <div class="mt-6 flex items-center justify-end gap-3">
      <Link
        :href="showHref"
        class="rounded-lg border border-sand-7 px-4 py-2.5 font-medium text-sand-11 transition hover:bg-sand-3"
      >
        Annuler
      </Link>
      <button
        type="button"
        class="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        @click="validate"
      >
        Valider ce planning
      </button>
    </div>
  </AdminLayout>
</template>
