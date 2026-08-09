<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'

/**
 * Import d'équipes depuis un fichier CSV / Excel (issue #120).
 *
 * Deux temps : on téléverse le fichier vers un endpoint d'**aperçu JSON** (fetch, pas
 * de rechargement de page), on montre le verdict ligne par ligne, puis on **confirme**
 * l'insertion via une visite Inertia classique (redirection → la liste se rafraîchit).
 */
const props = defineProps<{ tournamentId: number }>()

type ImportRowStatus = 'ok' | 'empty' | 'too_long' | 'duplicate_file' | 'duplicate_existing'
interface ImportRow {
  line: number
  raw: string
  name: string
  status: ImportRowStatus
}
interface ImportPreview {
  rows: ImportRow[]
  importable: string[]
  counts: { total: number; ok: number; skipped: number }
  truncated: boolean
}

const open = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const loading = ref(false)
const importing = ref(false)
const error = ref<string | null>(null)
const preview = ref<ImportPreview | null>(null)

const previewUrl = `/tournaments/${props.tournamentId}/teams/import/preview`
const importUrl = `/tournaments/${props.tournamentId}/teams/import`

const STATUS_META: Record<ImportRowStatus, { label: string; class: string }> = {
  ok: { label: 'À importer', class: 'bg-green-100 text-green-800' },
  empty: { label: 'Vide', class: 'bg-sand-3 text-sand-11' },
  too_long: { label: 'Trop long (> 60)', class: 'bg-amber-100 text-amber-800' },
  duplicate_file: { label: 'Doublon (fichier)', class: 'bg-amber-100 text-amber-800' },
  duplicate_existing: { label: 'Déjà présente', class: 'bg-sand-3 text-sand-11' },
}

/** Jeton anti-CSRF déposé par Shield (cookie `XSRF-TOKEN`), pour le fetch d'aperçu. */
function xsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function reset() {
  preview.value = null
  error.value = null
  fileName.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function toggleOpen() {
  open.value = !open.value
  if (!open.value) reset()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  preview.value = null
  error.value = null
  if (!file) {
    fileName.value = null
    return
  }
  fileName.value = file.name

  const body = new FormData()
  body.append('file', file)

  loading.value = true
  try {
    const res = await fetch(previewUrl, {
      method: 'POST',
      body,
      credentials: 'same-origin',
      headers: { 'X-XSRF-TOKEN': xsrfToken(), 'Accept': 'application/json' },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      error.value = data?.error ?? 'Import impossible. Vérifiez le fichier (CSV ou XLSX, ≤ 5 Mo).'
      return
    }
    preview.value = data as ImportPreview
  } catch {
    error.value = 'Import impossible (erreur réseau).'
  } finally {
    loading.value = false
  }
}

const canImport = computed(() => (preview.value?.importable.length ?? 0) > 0)

function confirmImport() {
  if (!preview.value || !canImport.value) return
  importing.value = true
  router.post(
    importUrl,
    { names: preview.value.importable },
    {
      preserveScroll: true,
      onSuccess: () => {
        reset()
        open.value = false
      },
      onFinish: () => {
        importing.value = false
      },
    }
  )
}
</script>

<template>
  <section class="rounded-2xl border border-sand-6 bg-white p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-sand-12">Importer des équipes</h2>
        <p class="mt-0.5 text-sm text-sand-11">
          Depuis un fichier CSV ou Excel (une équipe par ligne).
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-12 transition hover:bg-sand-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        :aria-expanded="open"
        @click="toggleOpen"
      >
        {{ open ? 'Fermer' : 'Importer' }}
      </button>
    </div>

    <div v-if="open" class="mt-4 space-y-4">
      <!-- Sélecteur de fichier -->
      <div>
        <label for="team-import-file" class="mb-1 block text-sm font-medium text-sand-12">
          Fichier
        </label>
        <input
          id="team-import-file"
          ref="fileInput"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="block w-full text-sm text-sand-11 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
          @change="onFileChange"
        />
        <p class="mt-1 text-xs text-sand-10">
          En-tête facultative (« Nom », « Équipe »…). Colonnes supplémentaires ignorées.
        </p>
      </div>

      <p v-if="loading" class="text-sm text-sand-11">Analyse du fichier…</p>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <!-- Aperçu -->
      <div v-if="preview" class="space-y-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span class="font-semibold text-sand-12">{{ preview.counts.ok }} à importer</span>
          <span v-if="preview.counts.skipped > 0" class="text-sand-11">
            {{ preview.counts.skipped }} ignorée{{ preview.counts.skipped > 1 ? 's' : '' }}
          </span>
        </div>

        <p v-if="preview.truncated" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Fichier volumineux : seules les 500 premières lignes ont été analysées.
        </p>

        <div
          v-if="preview.rows.length"
          class="max-h-72 overflow-y-auto rounded-lg border border-sand-6"
        >
          <table class="w-full border-collapse text-sm">
            <thead
              class="sticky top-0 bg-sand-2 text-left text-xs uppercase tracking-wide text-sand-10"
            >
              <tr>
                <th scope="col" class="px-3 py-2 font-semibold">Ligne</th>
                <th scope="col" class="px-3 py-2 font-semibold">Nom</th>
                <th scope="col" class="px-3 py-2 font-semibold">État</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in preview.rows" :key="row.line" class="border-t border-sand-6">
                <td class="px-3 py-1.5 text-sand-10 tabular-nums">{{ row.line }}</td>
                <td class="px-3 py-1.5 text-sand-12">
                  <span v-if="row.name">{{ row.name }}</span>
                  <span v-else class="italic text-sand-10">(vide)</span>
                </td>
                <td class="px-3 py-1.5">
                  <span
                    class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="STATUS_META[row.status].class"
                  >
                    {{ STATUS_META[row.status].label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="rounded-lg bg-sand-2 px-3 py-4 text-center text-sm text-sand-11">
          Aucune équipe détectée dans ce fichier.
        </p>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="!canImport || importing"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            @click="confirmImport"
          >
            Importer {{ preview.counts.ok }} équipe{{ preview.counts.ok > 1 ? 's' : '' }}
          </button>
          <button
            type="button"
            class="text-sm font-medium text-sand-11 transition hover:text-sand-12"
            @click="reset"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
