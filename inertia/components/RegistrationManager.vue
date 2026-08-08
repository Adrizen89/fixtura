<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Tournament } from '~/app/types'

/**
 * Gestion des inscriptions en ligne d'un tournoi (issue #112) — côté organisateur.
 * Ouvre/ferme le formulaire public, fixe une capacité facultative et donne le lien
 * non devinable à partager. La « fermeture pleine » est dérivée du nombre d'équipes.
 */
const props = defineProps<{ tournament: Tournament }>()

const teamsCount = computed(() => props.tournament.teams?.length ?? 0)
const isOpen = computed(() => props.tournament.registrationOpen)
const capacity = computed(() => props.tournament.registrationCapacity)
const isFull = computed(() => capacity.value !== null && teamsCount.value >= capacity.value)

/** URL absolue du lien public d'inscription (jeton non devinable). */
const publicUrl = computed(() =>
  props.tournament.registrationToken
    ? `${window.location.origin}/inscription/${props.tournament.registrationToken}`
    : null
)

const form = useForm({
  open: props.tournament.registrationOpen,
  capacity: props.tournament.registrationCapacity as number | null,
})

function submit() {
  form.patch(`/tournaments/${props.tournament.id}/registration`, { preserveScroll: true })
}

function toggle(open: boolean) {
  form.open = open
  submit()
}

const copied = ref(false)
async function copyLink() {
  if (!publicUrl.value) return
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border border-sand-6 bg-white p-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-sand-12">Inscriptions en ligne</h2>
      <span
        v-if="isOpen && isFull"
        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
      >
        Complet
      </span>
      <span
        v-else-if="isOpen"
        class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
      >
        Ouvertes
      </span>
      <span v-else class="rounded-full bg-sand-3 px-2 py-0.5 text-xs font-medium text-sand-11">
        Fermées
      </span>
    </div>

    <p class="mb-4 text-sm text-sand-11">
      Partagez un lien public pour que les équipes s'inscrivent elles-mêmes (sans compte).
      <template v-if="capacity !== null">
        {{ teamsCount }} / {{ capacity }} équipe(s) inscrite(s).
      </template>
      <template v-else> {{ teamsCount }} équipe(s) inscrite(s). </template>
    </p>

    <!-- Réglages : capacité + ouverture -->
    <form class="space-y-3" @submit.prevent="submit">
      <div>
        <label for="reg-capacity" class="mb-1 block text-sm font-medium text-sand-12">
          Capacité maximale <span class="font-normal text-sand-10">(laisser vide = illimité)</span>
        </label>
        <input
          id="reg-capacity"
          v-model.number="form.capacity"
          type="number"
          min="1"
          max="1000"
          placeholder="Illimité"
          class="w-40 rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': form.errors.capacity }"
        />
        <p v-if="form.errors.capacity" class="mt-1 text-sm text-red-700">
          {{ form.errors.capacity }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="!isOpen"
          type="button"
          :disabled="form.processing"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          @click="toggle(true)"
        >
          Ouvrir les inscriptions
        </button>
        <template v-else>
          <button
            type="submit"
            :disabled="form.processing"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            Enregistrer la capacité
          </button>
          <button
            type="button"
            :disabled="form.processing"
            class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 disabled:opacity-60"
            @click="toggle(false)"
          >
            Fermer les inscriptions
          </button>
        </template>
      </div>
    </form>

    <!-- Lien public à partager (visible dès qu'un jeton existe) -->
    <div v-if="publicUrl" class="mt-4 border-t border-sand-4 pt-4">
      <label
        for="reg-link"
        class="mb-1 block text-xs font-semibold uppercase tracking-wide text-sand-9"
      >
        Lien d'inscription
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="reg-link"
          :value="publicUrl"
          readonly
          class="min-w-0 flex-1 rounded-lg border border-sand-6 bg-sand-2 px-3 py-2 text-sm text-sand-11 outline-none"
          @focus="(e) => (e.target as HTMLInputElement).select()"
        />
        <button
          type="button"
          class="shrink-0 rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          @click="copyLink"
        >
          {{ copied ? 'Copié ✓' : 'Copier' }}
        </button>
        <a
          :href="publicUrl"
          target="_blank"
          rel="noopener"
          class="shrink-0 rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          Ouvrir ↗
        </a>
      </div>
      <p v-if="!isOpen" class="mt-2 text-xs text-sand-10">
        Les inscriptions sont fermées : ce lien affiche « fermé » tant que vous ne les rouvrez pas.
      </p>
    </div>
  </section>
</template>
