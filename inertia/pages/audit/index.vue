<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import type { AuditLogEntry } from '~/app/types'

/**
 * Journal d'audit du club (issue #117) — lecture seule, réservé au responsable.
 * Trace « qui / quoi / quand » sur les actions sensibles.
 */
const props = defineProps<{
  entries: AuditLogEntry[]
  pagination: { currentPage: number; lastPage: number; total: number }
}>()

/** Libellés lisibles des actions tracées. */
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'member.invited': 'Invitation d’un membre',
  'member.role_changed': 'Changement de rôle',
  'member.removed': 'Retrait d’un membre',
  'invitation.revoked': 'Révocation d’invitation',
  'tournament.deleted': 'Suppression d’un tournoi',
  'event.deleted': 'Suppression d’un événement',
  'event.category_deleted': 'Suppression d’une catégorie',
  'club.data_exported': 'Export des données du club',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Rend le contexte additionnel de façon compacte (ex. « organizer → owner »). */
function metadataLabel(entry: AuditLogEntry): string | null {
  const m = entry.metadata
  if (!m) return null
  if (m.from && m.to) return `${m.from} → ${m.to}`
  if (m.role) return `rôle : ${m.role}`
  return null
}

const hasEntries = computed(() => props.entries.length > 0)
const { currentPage, lastPage } = props.pagination
</script>

<template>
  <Head title="Journal d'audit" />

  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-sand-12">Journal d'audit</h1>
      <p class="mt-1 text-sand-11">
        Historique des actions sensibles du club (connexions, changements de rôle, suppressions).
        {{ pagination.total }} entrée(s).
      </p>
    </div>

    <section class="overflow-hidden rounded-2xl border border-sand-6 bg-white">
      <div v-if="hasEntries" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead
            class="border-b border-sand-6 bg-sand-2 text-xs uppercase tracking-wide text-sand-9"
          >
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Date</th>
              <th scope="col" class="px-4 py-3 font-semibold">Action</th>
              <th scope="col" class="px-4 py-3 font-semibold">Auteur</th>
              <th scope="col" class="px-4 py-3 font-semibold">Cible</th>
              <th scope="col" class="px-4 py-3 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sand-4">
            <tr v-for="entry in entries" :key="entry.id" class="text-sand-12">
              <td class="whitespace-nowrap px-4 py-2.5 tabular-nums text-sand-11">
                {{ formatDate(entry.createdAt) }}
              </td>
              <td class="px-4 py-2.5 font-medium">{{ actionLabel(entry.action) }}</td>
              <td class="px-4 py-2.5 text-sand-11">{{ entry.actorEmail ?? '—' }}</td>
              <td class="px-4 py-2.5">
                <span>{{ entry.target ?? '—' }}</span>
                <span v-if="metadataLabel(entry)" class="ml-1 text-xs text-sand-10">
                  ({{ metadataLabel(entry) }})
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-2.5 tabular-nums text-sand-10">
                {{ entry.ip ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="px-4 py-12 text-center text-sand-11">
        Aucune action sensible enregistrée pour l'instant.
      </p>
    </section>

    <!-- Pagination -->
    <nav
      v-if="lastPage > 1"
      class="mt-4 flex items-center justify-between text-sm"
      aria-label="Pagination du journal"
    >
      <Link
        v-if="currentPage > 1"
        :href="`/journal?page=${currentPage - 1}`"
        class="rounded-lg border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
      >
        ← Précédent
      </Link>
      <span v-else />
      <span class="text-sand-10">Page {{ currentPage }} / {{ lastPage }}</span>
      <Link
        v-if="currentPage < lastPage"
        :href="`/journal?page=${currentPage + 1}`"
        class="rounded-lg border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
      >
        Suivant →
      </Link>
      <span v-else />
    </nav>
  </AdminLayout>
</template>
