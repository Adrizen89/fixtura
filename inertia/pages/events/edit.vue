<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import EventForm from '~/components/EventForm.vue'
import type { EventFormData, EventItem } from '~/app/types'

const props = defineProps<{ event: EventItem }>()

const initial: EventFormData = {
  name: props.event.name,
  eventDate: props.event.eventDate.slice(0, 10),
  startTime: props.event.startTime.slice(0, 5),
  matchDurationMin: props.event.matchDurationMin,
  breakDurationMin: props.event.breakDurationMin,
  lunchStart: props.event.lunchStart ? props.event.lunchStart.slice(0, 5) : '',
  lunchDurationMin: props.event.lunchDurationMin,
  numTerrains: props.event.numTerrains,
}
</script>

<template>
  <Head :title="`Modifier — ${event.name}`" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="`/events/${event.id}`" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ event.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">Modifier l'événement</h1>
    </div>

    <EventForm
      :initial="initial"
      :action="`/events/${event.id}`"
      method="put"
      submit-label="Enregistrer"
      :cancel-href="`/events/${event.id}`"
    />
  </AdminLayout>
</template>
