<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import EventForm from '~/components/EventForm.vue'
import type { EventFormData } from '~/app/types'

const initial: EventFormData = {
  name: '',
  eventDate: '',
  startTime: '09:00',
  matchDurationMin: 10,
  breakDurationMin: 2,
  lunchStart: '',
  lunchDurationMin: 0,
  numTerrains: 3,
}
</script>

<template>
  <Head title="Nouvel événement" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/events" class="text-sm text-sand-11 hover:text-sand-12">← Événements</Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Nouvel événement</h1>
    </div>

    <EventForm
      :initial="initial"
      action="/events"
      method="post"
      submit-label="Créer l'événement"
      cancel-href="/events"
    />
  </AdminLayout>
</template>
