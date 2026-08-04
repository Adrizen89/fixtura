<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import type { Tournament } from '~/app/types'

defineProps<{ tournaments: Tournament[] }>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function destroy(t: Tournament) {
  if (confirm(`Supprimer le tournoi « ${t.name} » ? Cette action est irréversible.`)) {
    router.delete(`/tournaments/${t.id}`)
  }
}
</script>

<template>
  <Head title="Tournois" />

  <AdminLayout>
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">Tournois</h1>
        <p class="mt-1 text-sm text-sand-11">Gérez vos tournois et leurs plannings.</p>
      </div>
      <Link
        href="/tournaments/create"
        class="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
      >
        + Nouveau tournoi
      </Link>
    </div>

    <!-- État vide -->
    <div
      v-if="tournaments.length === 0"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">Aucun tournoi pour le moment.</p>
      <Link
        href="/tournaments/create"
        class="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-700"
      >
        Créer le premier tournoi
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
            <dt class="text-xs uppercase tracking-wide text-sand-9">Date</dt>
            <dd class="text-sand-12">{{ formatDate(t.eventDate) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Terrains</dt>
            <dd class="text-sand-12">{{ t.numTerrains }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Équipes</dt>
            <dd class="text-sand-12">{{ t.teamsCount ?? 0 }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">Début</dt>
            <dd class="text-sand-12">{{ t.startTime.slice(0, 5) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex items-center gap-3 border-t border-sand-5 pt-3 text-sm">
          <Link :href="`/tournaments/${t.id}`" class="font-medium text-primary hover:underline">
            Ouvrir
          </Link>
          <Link
            :href="`/tournaments/${t.id}/edit`"
            class="font-medium text-sand-11 hover:text-sand-12"
          >
            Modifier
          </Link>
          <button
            type="button"
            class="ml-auto font-medium text-red-700 hover:underline"
            @click="destroy(t)"
          >
            Supprimer
          </button>
        </div>
      </article>
    </div>
  </AdminLayout>
</template>
