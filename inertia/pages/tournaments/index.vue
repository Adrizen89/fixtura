<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import { useI18n } from '~/composables/i18n'
import type { Tournament } from '~/app/types'

defineProps<{ tournaments: Tournament[] }>()

// La variable de boucle `t` (Tournament) occupe déjà le nom `t` : on aliase donc la
// fonction de traduction pour éviter toute collision.
const { t: translate, dateLocale } = useI18n()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(dateLocale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function destroy(t: Tournament) {
  if (confirm(translate('tournamentsAdmin.index.deleteConfirm', { name: t.name }))) {
    router.delete(`/tournaments/${t.id}`)
  }
}
</script>

<template>
  <Head :title="translate('nav.tournaments')" />

  <AdminLayout>
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">
          {{ translate('nav.tournaments') }}
        </h1>
        <p class="mt-1 text-sm text-sand-11">{{ translate('tournamentsAdmin.index.subtitle') }}</p>
      </div>
      <Link
        href="/tournaments/create"
        class="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
      >
        + {{ translate('tournamentsAdmin.index.newTournament') }}
      </Link>
    </div>

    <!-- État vide -->
    <div
      v-if="tournaments.length === 0"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">{{ translate('tournamentsAdmin.index.empty') }}</p>
      <Link
        href="/tournaments/create"
        class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-700"
      >
        {{ translate('tournamentsAdmin.index.createFirst') }}
      </Link>
    </div>

    <!-- Liste -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="t in tournaments"
        :key="t.id"
        class="flex flex-col rounded-2xl border border-sand-6 bg-white p-5 transition hover:border-sand-8 hover:shadow-sm"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <Link
              :href="`/tournaments/${t.id}`"
              class="block truncate text-lg font-semibold text-sand-12 hover:text-primary"
            >
              {{ t.name }}
            </Link>
            <p class="text-sm text-sand-11">{{ t.category }}</p>
          </div>
          <StatusBadge :status="t.status" />
        </div>

        <dl class="grid grid-cols-2 gap-2 text-sm text-sand-11">
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ translate('tournamentsAdmin.index.date') }}
            </dt>
            <dd class="text-sand-12">{{ formatDate(t.eventDate) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ translate('tournamentsAdmin.index.pitches') }}
            </dt>
            <dd class="text-sand-12">{{ t.numTerrains }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ translate('tournamentsAdmin.index.teams') }}
            </dt>
            <dd class="text-sand-12">{{ t.teamsCount ?? 0 }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ translate('tournamentsAdmin.index.start') }}
            </dt>
            <dd class="text-sand-12">{{ t.startTime.slice(0, 5) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex items-center gap-3 border-t border-sand-5 pt-3 text-sm">
          <Link :href="`/tournaments/${t.id}`" class="font-medium text-primary hover:underline">
            {{ translate('tournamentsAdmin.index.open') }}
          </Link>
          <Link
            :href="`/tournaments/${t.id}/edit`"
            class="font-medium text-sand-11 hover:text-sand-12"
          >
            {{ translate('tournamentsAdmin.index.edit') }}
          </Link>
          <button
            type="button"
            class="ml-auto font-medium text-red-700 hover:underline"
            @click="destroy(t)"
          >
            {{ translate('tournamentsAdmin.index.delete') }}
          </button>
        </div>
      </article>
    </div>
  </AdminLayout>
</template>
