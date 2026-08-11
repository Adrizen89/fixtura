<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import EventForm from '~/components/EventForm.vue'
import { useI18n } from '~/composables/i18n'
import type { EventFormData } from '~/app/types'

const { t } = useI18n()

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
  <Head :title="t('eventsAdmin.create.title')" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/events" class="text-sm text-sand-11 hover:text-sand-12"
        >← {{ t('nav.events') }}</Link
      >
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('eventsAdmin.create.title') }}
      </h1>
    </div>

    <EventForm
      :initial="initial"
      action="/events"
      method="post"
      :submit-label="t('eventsAdmin.create.submit')"
      cancel-href="/events"
    />
  </AdminLayout>
</template>
