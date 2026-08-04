<script setup lang="ts">
import { Link, useForm } from '@inertiajs/vue3'
import type { TournamentFormData } from '~/app/types'

const props = defineProps<{
  initial: TournamentFormData
  action: string
  method: 'post' | 'put'
  submitLabel: string
  cancelHref: string
}>()

const form = useForm<TournamentFormData>({ ...props.initial })

function submit() {
  form.transform((data) => ({
    ...data,
    // Une chaîne vide = pas de pause déjeuner.
    lunchStart: data.lunchStart ? data.lunchStart : null,
  }))

  if (props.method === 'put') {
    form.put(props.action)
  } else {
    form.post(props.action)
  }
}
</script>

<template>
  <form class="space-y-8" @submit.prevent="submit">
    <!-- Général -->
    <section class="rounded-2xl border border-sand-6 bg-white p-6">
      <h2 class="mb-4 text-base font-semibold text-sand-12">Général</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="name" class="mb-1 block text-sm font-medium text-sand-12">Nom du tournoi</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="Tournoi de Pâques"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.name }"
          />
          <p v-if="form.errors.name" class="mt-1 text-sm text-red-700">{{ form.errors.name }}</p>
        </div>

        <div>
          <label for="category" class="mb-1 block text-sm font-medium text-sand-12">Catégorie</label>
          <input
            id="category"
            v-model="form.category"
            type="text"
            required
            placeholder="U11"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.category }"
          />
          <p v-if="form.errors.category" class="mt-1 text-sm text-red-700">
            {{ form.errors.category }}
          </p>
        </div>

        <div>
          <label for="eventDate" class="mb-1 block text-sm font-medium text-sand-12">Date</label>
          <input
            id="eventDate"
            v-model="form.eventDate"
            type="date"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.eventDate }"
          />
          <p v-if="form.errors.eventDate" class="mt-1 text-sm text-red-700">
            {{ form.errors.eventDate }}
          </p>
        </div>
      </div>
    </section>

    <!-- Horaires & terrains -->
    <section class="rounded-2xl border border-sand-6 bg-white p-6">
      <h2 class="mb-1 text-base font-semibold text-sand-12">Horaires & terrains</h2>
      <p class="mb-4 text-sm text-sand-11">
        Ces paramètres pilotent la génération automatique du planning.
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="startTime" class="mb-1 block text-sm font-medium text-sand-12">
            Heure de début
          </label>
          <input
            id="startTime"
            v-model="form.startTime"
            type="time"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.startTime }"
          />
          <p v-if="form.errors.startTime" class="mt-1 text-sm text-red-700">
            {{ form.errors.startTime }}
          </p>
        </div>

        <div>
          <label for="numTerrains" class="mb-1 block text-sm font-medium text-sand-12">
            Nombre de terrains
          </label>
          <input
            id="numTerrains"
            v-model.number="form.numTerrains"
            type="number"
            min="1"
            max="20"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.numTerrains }"
          />
          <p v-if="form.errors.numTerrains" class="mt-1 text-sm text-red-700">
            {{ form.errors.numTerrains }}
          </p>
        </div>

        <div>
          <label for="matchDurationMin" class="mb-1 block text-sm font-medium text-sand-12">
            Durée d'un match (min)
          </label>
          <input
            id="matchDurationMin"
            v-model.number="form.matchDurationMin"
            type="number"
            min="1"
            max="240"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.matchDurationMin }"
          />
          <p v-if="form.errors.matchDurationMin" class="mt-1 text-sm text-red-700">
            {{ form.errors.matchDurationMin }}
          </p>
        </div>

        <div>
          <label for="breakDurationMin" class="mb-1 block text-sm font-medium text-sand-12">
            Pause entre matchs (min)
          </label>
          <input
            id="breakDurationMin"
            v-model.number="form.breakDurationMin"
            type="number"
            min="0"
            max="120"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.breakDurationMin }"
          />
          <p v-if="form.errors.breakDurationMin" class="mt-1 text-sm text-red-700">
            {{ form.errors.breakDurationMin }}
          </p>
        </div>

        <div>
          <label for="lunchStart" class="mb-1 block text-sm font-medium text-sand-12">
            Début pause déjeuner
            <span class="font-normal text-sand-10">(optionnel)</span>
          </label>
          <input
            id="lunchStart"
            v-model="form.lunchStart"
            type="time"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.lunchStart }"
          />
          <p v-if="form.errors.lunchStart" class="mt-1 text-sm text-red-700">
            {{ form.errors.lunchStart }}
          </p>
        </div>

        <div>
          <label for="lunchDurationMin" class="mb-1 block text-sm font-medium text-sand-12">
            Durée pause déjeuner (min)
          </label>
          <input
            id="lunchDurationMin"
            v-model.number="form.lunchDurationMin"
            type="number"
            min="0"
            max="180"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.lunchDurationMin }"
          />
          <p v-if="form.errors.lunchDurationMin" class="mt-1 text-sm text-red-700">
            {{ form.errors.lunchDurationMin }}
          </p>
        </div>
      </div>
    </section>

    <div class="flex items-center justify-end gap-3">
      <Link
        :href="cancelHref"
        class="rounded-lg border border-sand-7 px-4 py-2.5 font-medium text-sand-11 transition hover:bg-sand-3"
      >
        Annuler
      </Link>
      <button
        type="submit"
        :disabled="form.processing"
        class="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ form.processing ? 'Enregistrement…' : submitLabel }}
      </button>
    </div>
  </form>
</template>
