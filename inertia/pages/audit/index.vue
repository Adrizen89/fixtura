<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import { useI18n } from '~/composables/i18n'
import type { AuditLogEntry } from '~/app/types'

const { t, dateLocale } = useI18n()

/**
 * Journal d'audit du club (issue #117) — lecture seule, réservé au responsable.
 * Trace « qui / quoi / quand » sur les actions sensibles.
 */
const props = defineProps<{
  entries: AuditLogEntry[]
  pagination: { currentPage: number; lastPage: number; total: number }
}>()

/** Clés de traduction des actions tracées. */
const ACTION_KEYS: Record<string, string> = {
  'auth.login': 'login',
  'member.invited': 'memberInvited',
  'member.role_changed': 'roleChanged',
  'member.removed': 'memberRemoved',
  'invitation.revoked': 'invitationRevoked',
  'tournament.deleted': 'tournamentDeleted',
  'event.deleted': 'eventDeleted',
  'event.category_deleted': 'categoryDeleted',
  'club.data_exported': 'dataExported',
}

function actionLabel(action: string): string {
  const key = ACTION_KEYS[action]
  return key ? t(`auditAdmin.action.${key}`) : action
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(dateLocale.value, {
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
  if (m.role) return t('auditAdmin.metaRole', { role: m.role })
  return null
}

const hasEntries = computed(() => props.entries.length > 0)
const { currentPage, lastPage } = props.pagination
</script>

<template>
  <Head :title="t('auditAdmin.title')" />

  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ t('auditAdmin.title') }}</h1>
      <p class="mt-1 text-sand-11">
        {{ t('auditAdmin.subtitle', { count: pagination.total }) }}
      </p>
    </div>

    <section class="overflow-hidden rounded-2xl border border-sand-6 bg-surface">
      <div v-if="hasEntries" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead
            class="border-b border-sand-6 bg-sand-2 text-xs uppercase tracking-wide text-sand-9"
          >
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">{{ t('auditAdmin.colDate') }}</th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ t('auditAdmin.colAction') }}</th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ t('auditAdmin.colAuthor') }}</th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ t('auditAdmin.colTarget') }}</th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ t('auditAdmin.colIp') }}</th>
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
        {{ t('auditAdmin.empty') }}
      </p>
    </section>

    <!-- Pagination -->
    <nav
      v-if="lastPage > 1"
      class="mt-4 flex items-center justify-between text-sm"
      :aria-label="t('auditAdmin.paginationLabel')"
    >
      <Link
        v-if="currentPage > 1"
        :href="`/journal?page=${currentPage - 1}`"
        class="rounded-lg border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
      >
        {{ t('auditAdmin.previous') }}
      </Link>
      <span v-else />
      <span class="text-sand-10">{{
        t('auditAdmin.pageOf', { current: currentPage, last: lastPage })
      }}</span>
      <Link
        v-if="currentPage < lastPage"
        :href="`/journal?page=${currentPage + 1}`"
        class="rounded-lg border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
      >
        {{ t('auditAdmin.next') }}
      </Link>
      <span v-else />
    </nav>
  </AdminLayout>
</template>
