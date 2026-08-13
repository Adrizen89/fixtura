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
        class="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        + {{ translate('tournamentsAdmin.index.newTournament') }}
      </Link>
    </div>

    <!-- État vide -->
    <div
      v-if="tournaments.length === 0"
      class="rounded-2xl border border-dashed border-sand-7 bg-surface-2 p-12 text-center"
    >
      <div
        class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-100 text-primary-800"
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      </div>
      <p class="text-sand-11">{{ translate('tournamentsAdmin.index.empty') }}</p>
      <Link
        href="/tournaments/create"
        class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-primary-700"
      >
        {{ translate('tournamentsAdmin.index.createFirst') }}
      </Link>
    </div>

    <!-- Liste -->
    <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="t in tournaments"
        :key="t.id"
        class="flex flex-col overflow-hidden rounded-2xl border border-sand-6 bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sand-7 hover:shadow-md"
      >
        <div class="p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <Link
                :href="`/tournaments/${t.id}`"
                class="block truncate text-lg font-bold tracking-tight text-sand-12 hover:text-primary"
              >
                {{ t.name }}
              </Link>
              <p class="mt-0.5 truncate text-sm text-sand-11">{{ t.category }}</p>
            </div>
            <StatusBadge :status="t.status" />
          </div>

          <div class="mt-3 flex items-center gap-2 text-sm text-sand-11">
            <span class="text-primary" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
            </span>
            <span>{{ formatDate(t.eventDate) }}</span>
          </div>

          <dl
            class="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-sand-5 bg-surface-2 px-2 py-3"
          >
            <div class="text-center">
              <dd class="text-xl font-extrabold tabular-nums tracking-tight text-sand-12">
                {{ t.teamsCount ?? 0 }}
              </dd>
              <dt class="text-[0.7rem] font-semibold text-sand-9">
                {{ translate('tournamentsAdmin.index.teams') }}
              </dt>
            </div>
            <div class="text-center">
              <dd class="text-xl font-extrabold tabular-nums tracking-tight text-sand-12">
                {{ t.numTerrains }}
              </dd>
              <dt class="text-[0.7rem] font-semibold text-sand-9">
                {{ translate('tournamentsAdmin.index.pitches') }}
              </dt>
            </div>
            <div class="text-center">
              <dd class="text-xl font-extrabold tabular-nums tracking-tight text-sand-12">
                {{ t.startTime.slice(0, 5) }}
              </dd>
              <dt class="text-[0.7rem] font-semibold text-sand-9">
                {{ translate('tournamentsAdmin.index.start') }}
              </dt>
            </div>
          </dl>
        </div>

        <div class="mt-auto flex items-center gap-1 border-t border-sand-5 px-3 py-2.5 text-sm">
          <Link
            :href="`/tournaments/${t.id}`"
            class="rounded-lg px-2.5 py-1.5 font-semibold text-primary transition hover:bg-primary-50"
          >
            {{ translate('tournamentsAdmin.index.open') }}
          </Link>
          <Link
            :href="`/tournaments/${t.id}/edit`"
            class="rounded-lg px-2.5 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          >
            {{ translate('tournamentsAdmin.index.edit') }}
          </Link>
          <button
            type="button"
            class="ml-auto rounded-lg px-2.5 py-1.5 font-medium text-sand-10 transition hover:bg-red-50 hover:text-red-700"
            @click="destroy(t)"
          >
            {{ translate('tournamentsAdmin.index.delete') }}
          </button>
        </div>
      </article>
    </div>
  </AdminLayout>
</template>
