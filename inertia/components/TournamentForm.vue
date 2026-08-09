<script setup lang="ts">
import { computed } from 'vue'
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

// Champs de format conditionnels au type choisi.
const needsPools = computed(() => form.format === 'pools' || form.format === 'hybrid')
const needsQualifiers = computed(() => form.format === 'hybrid')
const allowsThird = computed(() => form.format === 'knockout' || form.format === 'hybrid')

// Libellé du rang repêché : « 3es » si 2 qualifiés par poule, « 4es » si 3, etc.
const nextRankLabel = computed(() => `${(form.qualifiersPerPool ?? 2) + 1}es`)

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
          <label for="name" class="mb-1 block text-sm font-medium text-sand-12"
            >Nom du tournoi</label
          >
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
          <label for="category" class="mb-1 block text-sm font-medium text-sand-12"
            >Catégorie</label
          >
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

    <!-- Format -->
    <section class="rounded-2xl border border-sand-6 bg-white p-6">
      <h2 class="mb-1 text-base font-semibold text-sand-12">Format</h2>
      <p class="mb-4 text-sm text-sand-11">Détermine comment le planning est généré.</p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div :class="{ 'sm:col-span-2': !needsPools }">
          <label for="format" class="mb-1 block text-sm font-medium text-sand-12">
            Type de compétition
          </label>
          <select
            id="format"
            v-model="form.format"
            class="w-full rounded-lg border border-sand-7 bg-white px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.format }"
          >
            <option value="championship">Championnat — toutes les équipes se rencontrent</option>
            <option value="pools">Poules</option>
            <option value="knockout">Élimination directe</option>
            <option value="hybrid">Hybride — poules puis phase finale</option>
          </select>
          <p v-if="form.errors.format" class="mt-1 text-sm text-red-700">
            {{ form.errors.format }}
          </p>
        </div>

        <div v-if="needsPools">
          <label for="numPools" class="mb-1 block text-sm font-medium text-sand-12">
            Nombre de poules
          </label>
          <input
            id="numPools"
            v-model.number="form.numPools"
            type="number"
            min="2"
            max="64"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.numPools }"
          />
          <p v-if="form.errors.numPools" class="mt-1 text-sm text-red-700">
            {{ form.errors.numPools }}
          </p>
        </div>

        <div v-if="needsQualifiers">
          <label for="qualifiersPerPool" class="mb-1 block text-sm font-medium text-sand-12">
            Qualifiés par poule
          </label>
          <input
            id="qualifiersPerPool"
            v-model.number="form.qualifiersPerPool"
            type="number"
            min="1"
            max="32"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.qualifiersPerPool }"
          />
          <p v-if="form.errors.qualifiersPerPool" class="mt-1 text-sm text-red-700">
            {{ form.errors.qualifiersPerPool }}
          </p>
        </div>

        <div v-if="needsQualifiers">
          <label for="bestRunnersUp" class="mb-1 block text-sm font-medium text-sand-12">
            Meilleurs repêchés
          </label>
          <input
            id="bestRunnersUp"
            v-model.number="form.bestRunnersUp"
            type="number"
            min="0"
            max="64"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.bestRunnersUp }"
          />
          <p class="mt-1 text-xs text-sand-11">
            Repêche les meilleurs {{ nextRankLabel }} de poule, toutes poules confondues (0 = aucun
            repêchage).
          </p>
          <p v-if="form.errors.bestRunnersUp" class="mt-1 text-sm text-red-700">
            {{ form.errors.bestRunnersUp }}
          </p>
        </div>

        <label
          v-if="allowsThird"
          for="thirdPlace"
          class="flex items-center gap-2 sm:col-span-2 text-sm text-sand-12"
        >
          <input
            id="thirdPlace"
            v-model="form.thirdPlace"
            type="checkbox"
            class="h-4 w-4 rounded border-sand-7 text-primary focus:ring-2 focus:ring-primary/30"
          />
          Disputer la petite finale (3<sup>e</sup> place)
        </label>
      </div>
    </section>

    <!-- Barème de points (issue #104) -->
    <section class="rounded-2xl border border-sand-6 bg-white p-6">
      <h2 class="mb-1 text-base font-semibold text-sand-12">Barème de points</h2>
      <p class="mb-4 text-sm text-sand-11">
        Points attribués au classement. Par défaut : victoire 3, nul 1, défaite 0.
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label for="winPoints" class="mb-1 block text-sm font-medium text-sand-12">
            Victoire
          </label>
          <input
            id="winPoints"
            v-model.number="form.winPoints"
            type="number"
            min="0"
            max="10"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.winPoints }"
          />
          <p v-if="form.errors.winPoints" class="mt-1 text-sm text-red-700">
            {{ form.errors.winPoints }}
          </p>
        </div>

        <div>
          <label for="drawPoints" class="mb-1 block text-sm font-medium text-sand-12">Nul</label>
          <input
            id="drawPoints"
            v-model.number="form.drawPoints"
            type="number"
            min="0"
            max="10"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.drawPoints }"
          />
          <p v-if="form.errors.drawPoints" class="mt-1 text-sm text-red-700">
            {{ form.errors.drawPoints }}
          </p>
        </div>

        <div>
          <label for="lossPoints" class="mb-1 block text-sm font-medium text-sand-12">
            Défaite
          </label>
          <input
            id="lossPoints"
            v-model.number="form.lossPoints"
            type="number"
            min="0"
            max="10"
            required
            class="w-full rounded-lg border border-sand-7 px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': form.errors.lossPoints }"
          />
          <p v-if="form.errors.lossPoints" class="mt-1 text-sm text-red-700">
            {{ form.errors.lossPoints }}
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
