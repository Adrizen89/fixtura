<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import PlanningGrid from '~/components/PlanningGrid.vue'
import { useI18n } from '~/composables/i18n'
import type { PlanningView, Tournament } from '~/app/types'

const props = defineProps<{
  tournament: Tournament
  preview: PlanningView
  hasExistingPlanning: boolean
}>()

const { t } = useI18n()

const showHref = `/tournaments/${props.tournament.id}`

function validate() {
  if (props.hasExistingPlanning && !confirm(t('tournamentsAdmin.planning.replaceConfirm'))) {
    return
  }
  router.post(`/tournaments/${props.tournament.id}/planning`)
}
</script>

<template>
  <Head :title="t('tournamentsAdmin.planning.headTitle', { name: tournament.name })" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="showHref" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ tournament.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('tournamentsAdmin.planning.title') }}
      </h1>
      <p class="mt-1 text-sand-11">
        {{ t('tournamentsAdmin.planning.intro') }}
      </p>
    </div>

    <!-- Avertissement régénération -->
    <div
      v-if="hasExistingPlanning"
      class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="alert"
    >
      {{ t('tournamentsAdmin.planning.regenWarning') }}
    </div>

    <!-- Résumé -->
    <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('tournamentsAdmin.planning.matches') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.matchCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('tournamentsAdmin.planning.rounds') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.roundsCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('tournamentsAdmin.planning.slots') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.slotsCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-white p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('tournamentsAdmin.planning.timeRange') }}
        </dt>
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
        {{ t('tournamentsAdmin.planning.cancel') }}
      </Link>
      <button
        type="button"
        class="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        @click="validate"
      >
        {{ t('tournamentsAdmin.planning.confirm') }}
      </button>
    </div>
  </AdminLayout>
</template>
