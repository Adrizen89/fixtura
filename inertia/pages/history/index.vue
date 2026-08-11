<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import { useI18n } from '~/composables/i18n'
import type { EventItem, Tournament } from '~/app/types'

const { t, dateLocale } = useI18n()

/**
 * Historique (issue #108) — archives du club en **lecture seule**. Liste les
 * éditions terminées (événements + tournois autonomes) ; chaque carte renvoie vers
 * l'écran public figé (planning + résultats + classement final). Aucune action de
 * gestion (créer / modifier / supprimer) : c'est une consultation d'archives.
 */
const props = defineProps<{ events: EventItem[]; tournaments: Tournament[] }>()

const isEmpty = computed(() => props.events.length === 0 && props.tournaments.length === 0)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(dateLocale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <Head :title="t('nav.history')" />

  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ t('nav.history') }}</h1>
      <p class="mt-1 text-sm text-sand-11">
        {{ t('historyAdmin.subtitle') }}
      </p>
    </div>

    <!-- État vide -->
    <div
      v-if="isEmpty"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">{{ t('historyAdmin.emptyTitle') }}</p>
      <p class="mt-1 text-sm text-sand-9">
        {{ t('historyAdmin.emptyHint') }}
      </p>
    </div>

    <template v-else>
      <!-- Événements terminés -->
      <section v-if="events.length" class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-sand-12">
          {{ t('historyAdmin.eventsHeading') }}
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="e in events"
            :key="`e-${e.id}`"
            class="flex flex-col rounded-2xl border border-sand-6 bg-white p-5 transition hover:border-sand-8 hover:shadow-sm"
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <span class="min-w-0 truncate text-lg font-semibold text-sand-12">{{ e.name }}</span>
              <StatusBadge :status="e.status" />
            </div>

            <dl class="grid grid-cols-2 gap-2 text-sm text-sand-11">
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.date') }}
                </dt>
                <dd class="text-sand-12">{{ formatDate(e.eventDate) }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.categories') }}
                </dt>
                <dd class="text-sand-12">{{ e.categoriesCount ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.terrains') }}
                </dt>
                <dd class="text-sand-12">{{ e.numTerrains }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.start') }}
                </dt>
                <dd class="text-sand-12">{{ e.startTime.slice(0, 5) }}</dd>
              </div>
            </dl>

            <div class="mt-4 border-t border-sand-5 pt-3 text-sm">
              <a
                :href="`/e/${e.publicSlug}`"
                target="_blank"
                rel="noopener"
                class="font-medium text-primary hover:underline"
              >
                {{ t('historyAdmin.viewReadOnly') }}
              </a>
            </div>
          </article>
        </div>
      </section>

      <!-- Tournois autonomes terminés -->
      <section v-if="tournaments.length">
        <h2 class="mb-4 text-lg font-semibold text-sand-12">
          {{ t('historyAdmin.tournamentsHeading') }}
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="tournament in tournaments"
            :key="`t-${tournament.id}`"
            class="flex flex-col rounded-2xl border border-sand-6 bg-white p-5 transition hover:border-sand-8 hover:shadow-sm"
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <span class="block truncate text-lg font-semibold text-sand-12">{{
                  tournament.name
                }}</span>
                <p class="text-sm text-sand-11">{{ tournament.category }}</p>
              </div>
              <StatusBadge :status="tournament.status" />
            </div>

            <dl class="grid grid-cols-2 gap-2 text-sm text-sand-11">
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.date') }}
                </dt>
                <dd class="text-sand-12">{{ formatDate(tournament.eventDate) }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.teams') }}
                </dt>
                <dd class="text-sand-12">{{ tournament.teamsCount ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.terrains') }}
                </dt>
                <dd class="text-sand-12">{{ tournament.numTerrains }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-sand-9">
                  {{ t('historyAdmin.start') }}
                </dt>
                <dd class="text-sand-12">{{ tournament.startTime.slice(0, 5) }}</dd>
              </div>
            </dl>

            <div class="mt-4 border-t border-sand-5 pt-3 text-sm">
              <a
                :href="`/t/${tournament.publicSlug}`"
                target="_blank"
                rel="noopener"
                class="font-medium text-primary hover:underline"
              >
                {{ t('historyAdmin.viewReadOnly') }}
              </a>
            </div>
          </article>
        </div>
      </section>
    </template>
  </AdminLayout>
</template>
