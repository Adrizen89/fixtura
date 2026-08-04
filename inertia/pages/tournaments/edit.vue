<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import TournamentForm from '~/components/TournamentForm.vue'
import type { Tournament, TournamentFormData } from '~/app/types'

const props = defineProps<{ tournament: Tournament }>()

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
}
</script>

<template>
  <Head :title="`Modifier — ${tournament.name}`" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="`/tournaments/${tournament.id}`" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ tournament.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Modifier le tournoi</h1>
    </div>

    <TournamentForm
      :initial="initial"
      :action="`/tournaments/${tournament.id}`"
      method="put"
      submit-label="Enregistrer les modifications"
      :cancel-href="`/tournaments/${tournament.id}`"
    />
  </AdminLayout>
</template>
