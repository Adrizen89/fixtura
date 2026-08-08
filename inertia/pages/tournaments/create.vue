<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import TournamentForm from '~/components/TournamentForm.vue'
import type { TournamentFormData } from '~/app/types'

const initial: TournamentFormData = {
  name: '',
  category: '',
  eventDate: '',
  startTime: '09:00',
  matchDurationMin: 10,
  breakDurationMin: 2,
  lunchStart: '',
  lunchDurationMin: 0,
  numTerrains: 2,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  format: 'championship',
  numPools: null,
  qualifiersPerPool: null,
  bestRunnersUp: null,
  thirdPlace: false,
}
</script>

<template>
  <Head title="Nouveau tournoi" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/tournaments" class="text-sm text-sand-11 hover:text-sand-12">← Tournois</Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Nouveau tournoi</h1>
    </div>

    <TournamentForm
      :initial="initial"
      action="/tournaments"
      method="post"
      submit-label="Créer le tournoi"
      cancel-href="/tournaments"
    />
  </AdminLayout>
</template>
