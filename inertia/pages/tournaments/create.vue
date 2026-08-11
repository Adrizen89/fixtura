<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import TournamentForm from '~/components/TournamentForm.vue'
import { useI18n } from '~/composables/i18n'
import type { TournamentFormData } from '~/app/types'

const { t } = useI18n()

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
  swissRounds: null,
}
</script>

<template>
  <Head :title="t('tournamentsAdmin.create.title')" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/tournaments" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ t('nav.tournaments') }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('tournamentsAdmin.create.title') }}
      </h1>
    </div>

    <TournamentForm
      :initial="initial"
      action="/tournaments"
      method="post"
      :submit-label="t('tournamentsAdmin.create.submit')"
      cancel-href="/tournaments"
    />
  </AdminLayout>
</template>
