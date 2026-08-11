<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import TournamentForm from '~/components/TournamentForm.vue'
import { useI18n } from '~/composables/i18n'
import type { Tournament, TournamentFormData } from '~/app/types'

const props = defineProps<{ tournament: Tournament }>()

const { t } = useI18n()

function hhmm(v: string | null): string {
  return v ? v.slice(0, 5) : ''
}

const initial: TournamentFormData = {
  name: props.tournament.name,
  category: props.tournament.category,
  eventDate: props.tournament.eventDate.slice(0, 10),
  startTime: hhmm(props.tournament.startTime),
  matchDurationMin: props.tournament.matchDurationMin,
  breakDurationMin: props.tournament.breakDurationMin,
  lunchStart: hhmm(props.tournament.lunchStart),
  lunchDurationMin: props.tournament.lunchDurationMin,
  numTerrains: props.tournament.numTerrains,
  winPoints: props.tournament.winPoints,
  drawPoints: props.tournament.drawPoints,
  lossPoints: props.tournament.lossPoints,
  format: props.tournament.format,
  numPools: props.tournament.formatConfig?.numPools ?? null,
  qualifiersPerPool: props.tournament.formatConfig?.qualifiersPerPool ?? null,
  bestRunnersUp: props.tournament.formatConfig?.bestRunnersUp ?? null,
  thirdPlace: props.tournament.formatConfig?.thirdPlace ?? false,
  swissRounds: props.tournament.formatConfig?.swissRounds ?? null,
}
</script>

<template>
  <Head :title="t('tournamentsAdmin.edit.headTitle', { name: tournament.name })" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="`/tournaments/${tournament.id}`" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ tournament.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('tournamentsAdmin.edit.title') }}
      </h1>
    </div>

    <TournamentForm
      :initial="initial"
      :action="`/tournaments/${tournament.id}`"
      method="put"
      :submit-label="t('tournamentsAdmin.edit.submit')"
      :cancel-href="`/tournaments/${tournament.id}`"
    />
  </AdminLayout>
</template>
