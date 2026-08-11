<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { router, useForm } from '@inertiajs/vue3'
import type { Team } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

const props = defineProps<{
  tournamentId: number
  teams: Team[]
}>()

/** Ajout d'une équipe. */
const addForm = useForm({ name: '' })

function addTeam() {
  addForm.post(`/tournaments/${props.tournamentId}/teams`, {
    preserveScroll: true,
    onSuccess: () => addForm.reset('name'),
  })
}

/** Renommage inline : une seule équipe éditée à la fois. */
const editingId = ref<number | null>(null)
const editForm = useForm({ name: '' })
const editInput = ref<HTMLInputElement | null>(null)

// Ref fonctionnelle : le champ édité est dans un v-for, une seule ligne à la fois.
function setEditInput(el: Element | ComponentPublicInstance | null) {
  editInput.value = (el as HTMLInputElement) ?? null
}

async function startEdit(team: Team) {
  editingId.value = team.id
  editForm.clearErrors()
  editForm.name = team.name
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

function cancelEdit() {
  editingId.value = null
  editForm.reset('name')
  editForm.clearErrors()
}

function saveEdit() {
  if (editingId.value === null) return
  editForm.put(`/tournaments/${props.tournamentId}/teams/${editingId.value}`, {
    preserveScroll: true,
    onSuccess: () => cancelEdit(),
  })
}

/** Suppression d'une équipe (confirmation, cf. pattern de la liste des tournois). */
function destroyTeam(team: Team) {
  if (!confirm(t('teamsManager.confirmDelete', { name: team.name }))) return
  router.delete(`/tournaments/${props.tournamentId}/teams/${team.id}`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <section class="rounded-2xl border border-sand-6 bg-white p-6">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-semibold text-sand-12">{{ t('teamsManager.title') }}</h2>
      <span
        class="rounded-full bg-sand-3 px-2 py-0.5 text-xs font-medium text-sand-11"
        :aria-label="t('teamsManager.countLabel')"
      >
        {{ teams.length }}
      </span>
    </div>

    <!-- Ajout -->
    <form class="mb-4" @submit.prevent="addTeam">
      <label for="new-team" class="sr-only">{{ t('teamsManager.addLabel') }}</label>
      <div class="flex gap-2">
        <input
          id="new-team"
          v-model="addForm.name"
          type="text"
          required
          maxlength="60"
          :placeholder="t('teamsManager.namePlaceholder')"
          autocomplete="off"
          class="min-w-0 flex-1 rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': addForm.errors.name }"
        />
        <button
          type="submit"
          :disabled="addForm.processing"
          class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ t('teamsManager.add') }}
        </button>
      </div>
      <p v-if="addForm.errors.name" class="mt-1 text-sm text-red-700">{{ addForm.errors.name }}</p>
    </form>

    <!-- Liste -->
    <ul v-if="teams.length" class="space-y-1.5">
      <li
        v-for="team in teams"
        :key="team.id"
        class="rounded-md bg-sand-2 px-3 py-1.5 text-sm text-sand-12"
      >
        <!-- Mode renommage -->
        <form v-if="editingId === team.id" class="space-y-1" @submit.prevent="saveEdit">
          <div class="flex items-center gap-2">
            <label :for="`edit-team-${team.id}`" class="sr-only">{{
              t('teamsManager.renameLabel')
            }}</label>
            <input
              :id="`edit-team-${team.id}`"
              :ref="setEditInput"
              v-model="editForm.name"
              type="text"
              required
              maxlength="60"
              autocomplete="off"
              class="min-w-0 flex-1 rounded-md border border-sand-7 bg-white px-2 py-1 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': editForm.errors.name }"
              @keyup.escape="cancelEdit"
            />
            <button
              type="submit"
              :disabled="editForm.processing"
              class="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {{ t('teamsManager.save') }}
            </button>
            <button
              type="button"
              class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-sand-11 transition hover:text-sand-12"
              @click="cancelEdit"
            >
              {{ t('teamsManager.cancel') }}
            </button>
          </div>
          <p v-if="editForm.errors.name" class="text-sm text-red-700">{{ editForm.errors.name }}</p>
        </form>

        <!-- Mode affichage -->
        <div v-else class="flex items-center gap-2">
          <span class="min-w-0 flex-1 truncate">
            {{ team.name }}
            <!-- Contact d'une équipe inscrite en ligne (#112) — visible orga uniquement. -->
            <a
              v-if="team.contactEmail"
              :href="`mailto:${team.contactEmail}`"
              class="ml-1 text-xs font-normal text-sand-10 hover:text-sand-12 hover:underline"
              :title="t('teamsManager.contact', { email: team.contactEmail })"
            >
              · {{ team.contactEmail }}
            </a>
          </span>
          <button
            type="button"
            class="shrink-0 text-xs font-medium text-sand-11 transition hover:text-sand-12"
            @click="startEdit(team)"
          >
            {{ t('teamsManager.rename') }}
          </button>
          <button
            type="button"
            class="shrink-0 text-xs font-medium text-red-700 transition hover:underline"
            @click="destroyTeam(team)"
          >
            {{ t('teamsManager.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <!-- État vide -->
    <p v-else class="rounded-md bg-sand-2 px-3 py-4 text-center text-sm text-sand-11">
      {{ t('teamsManager.empty') }}
    </p>
  </section>
</template>
