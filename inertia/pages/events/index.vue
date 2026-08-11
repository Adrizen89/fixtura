<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import { useI18n } from '~/composables/i18n'
import type { EventItem } from '~/app/types'

const { t, dateLocale } = useI18n()

defineProps<{ events: EventItem[] }>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(dateLocale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function destroy(e: EventItem) {
  if (confirm(t('eventsAdmin.index.confirmDelete', { name: e.name }))) {
    router.delete(`/events/${e.id}`)
  }
}
</script>

<template>
  <Head :title="t('nav.events')" />

  <AdminLayout>
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ t('nav.events') }}</h1>
        <p class="mt-1 text-sm text-sand-11">
          {{ t('eventsAdmin.index.subtitle') }}
        </p>
      </div>
      <Link
        href="/events/create"
        class="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
      >
        + {{ t('eventsAdmin.index.newEvent') }}
      </Link>
    </div>

    <!-- État vide -->
    <div
      v-if="events.length === 0"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">{{ t('eventsAdmin.index.empty') }}</p>
      <Link
        href="/events/create"
        class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-700"
      >
        {{ t('eventsAdmin.index.createFirst') }}
      </Link>
    </div>

    <!-- Liste -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="e in events"
        :key="e.id"
        class="flex flex-col rounded-2xl border border-sand-6 bg-white p-5 transition hover:border-sand-8 hover:shadow-sm"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <Link
            :href="`/events/${e.id}`"
            class="block truncate text-lg font-semibold text-sand-12 hover:text-primary"
          >
            {{ e.name }}
          </Link>
          <StatusBadge :status="e.status" />
        </div>

        <dl class="grid grid-cols-2 gap-2 text-sm text-sand-11">
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.index.date') }}
            </dt>
            <dd class="text-sand-12">{{ formatDate(e.eventDate) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.index.pitches') }}
            </dt>
            <dd class="text-sand-12">{{ e.numTerrains }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.index.categories') }}
            </dt>
            <dd class="text-sand-12">{{ e.categoriesCount ?? 0 }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.index.start') }}
            </dt>
            <dd class="text-sand-12">{{ e.startTime.slice(0, 5) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex items-center gap-3 border-t border-sand-5 pt-3 text-sm">
          <Link :href="`/events/${e.id}`" class="font-medium text-primary hover:underline">
            {{ t('eventsAdmin.index.open') }}
          </Link>
          <a
            :href="`/e/${e.publicSlug}`"
            target="_blank"
            rel="noopener"
            class="font-medium text-sand-11 hover:text-sand-12"
          >
            {{ t('eventsAdmin.index.publicScreen') }}
          </a>
          <button
            type="button"
            class="ml-auto font-medium text-red-700 hover:underline"
            @click="destroy(e)"
          >
            {{ t('eventsAdmin.index.delete') }}
          </button>
        </div>
      </article>
    </div>
  </AdminLayout>
</template>
