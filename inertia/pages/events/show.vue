<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, Link, router, useForm } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import PlanningGrid from '~/components/PlanningGrid.vue'
import { useI18n } from '~/composables/i18n'
import type {
  EventCategory,
  EventCategoryFormData,
  EventItem,
  EventPlanningView,
} from '~/app/types'

const { t, dateLocale } = useI18n()

const props = defineProps<{
  event: EventItem
  categories: EventCategory[]
  planning: EventPlanningView | null
}>()

/** Une catégorie planifiable a au moins 2 équipes. */
const readyCategories = computed(() => props.categories.filter((c) => (c.teamsCount ?? 0) >= 2))
const canGenerate = computed(
  () => props.categories.length > 0 && readyCategories.value.length === props.categories.length
)

/** Onglet de catégorie sélectionné dans l'aperçu du planning combiné. */
const activeCategory = ref<number | null>(props.planning?.categories[0]?.categoryId ?? null)
const activePlanning = computed(
  () => props.planning?.categories.find((c) => c.categoryId === activeCategory.value) ?? null
)

const formatLabels = computed<Record<string, string>>(() => ({
  championship: t('eventsAdmin.show.formatChampionship'),
  pools: t('eventsAdmin.show.formatPools'),
  knockout: t('eventsAdmin.show.formatKnockout'),
  hybrid: t('eventsAdmin.show.formatHybrid'),
}))

const form = useForm<EventCategoryFormData>({
  name: '',
  category: '',
  format: 'championship',
  numPools: null,
  thirdPlace: false,
})
const needsPools = computed(() => form.format === 'pools')
const allowsThird = computed(() => form.format === 'knockout')

function addCategory() {
  form.transform((data) => ({
    ...data,
    numPools: data.format === 'pools' ? data.numPools : null,
    thirdPlace: data.format === 'knockout' ? data.thirdPlace : false,
  }))
  form.post(`/events/${props.event.id}/categories`, {
    onSuccess: () => form.reset(),
  })
}

function destroyCategory(c: EventCategory) {
  if (confirm(t('eventsAdmin.show.confirmDeleteCategory', { name: c.name }))) {
    router.delete(`/events/${props.event.id}/categories/${c.id}`)
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(dateLocale.value, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function hhmm(v: string | null) {
  return v ? v.slice(0, 5) : '—'
}
</script>

<template>
  <Head :title="event.name" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/events" class="text-sm text-sand-11 hover:text-sand-12"
        >← {{ t('nav.events') }}</Link
      >
      <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ event.name }}</h1>
          <StatusBadge :status="event.status" />
        </div>
        <div class="flex items-center gap-2">
          <a
            :href="`/e/${event.publicSlug}`"
            target="_blank"
            rel="noopener"
            class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          >
            {{ t('eventsAdmin.show.publicScreen') }}
          </a>
          <Link
            :href="`/events/${event.id}/edit`"
            class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          >
            {{ t('eventsAdmin.show.edit') }}
          </Link>
        </div>
      </div>
      <p class="mt-1 text-sand-11">{{ formatDate(event.eventDate) }}</p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Paramètres partagés -->
      <section class="rounded-2xl border border-sand-6 bg-white p-6 lg:col-span-2">
        <h2 class="mb-4 text-base font-semibold text-sand-12">
          {{ t('eventsAdmin.show.sharedSettings') }}
        </h2>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.show.startTime') }}
            </dt>
            <dd class="mt-0.5 text-sand-12">{{ hhmm(event.startTime) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.show.pitchesPool') }}
            </dt>
            <dd class="mt-0.5 text-sand-12">{{ event.numTerrains }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.show.matchDuration') }}
            </dt>
            <dd class="mt-0.5 text-sand-12">{{ event.matchDurationMin }} min</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.show.breakBetween') }}
            </dt>
            <dd class="mt-0.5 text-sand-12">{{ event.breakDurationMin }} min</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-sand-9">
              {{ t('eventsAdmin.show.lunchBreak') }}
            </dt>
            <dd class="mt-0.5 text-sand-12">
              <template v-if="event.lunchStart">
                {{ hhmm(event.lunchStart) }} ({{ event.lunchDurationMin }} min)
              </template>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Ajouter une catégorie -->
      <section class="rounded-2xl border border-sand-6 bg-white p-6">
        <h2 class="mb-4 text-base font-semibold text-sand-12">
          {{ t('eventsAdmin.show.addCategory') }}
        </h2>
        <form class="space-y-3" @submit.prevent="addCategory">
          <div>
            <label for="cat-name" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('eventsAdmin.show.nameLabel') }}
            </label>
            <input
              id="cat-name"
              v-model="form.name"
              type="text"
              required
              :placeholder="t('eventsAdmin.show.namePlaceholder')"
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.name }"
            />
            <p v-if="form.errors.name" class="mt-1 text-sm text-red-700">{{ form.errors.name }}</p>
          </div>
          <div>
            <label for="cat-category" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('eventsAdmin.show.categoryLabel') }}
            </label>
            <input
              id="cat-category"
              v-model="form.category"
              type="text"
              required
              placeholder="U11"
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.category }"
            />
            <p v-if="form.errors.category" class="mt-1 text-sm text-red-700">
              {{ form.errors.category }}
            </p>
          </div>
          <div>
            <label for="cat-format" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('eventsAdmin.show.formatLabel') }}
            </label>
            <select
              id="cat-format"
              v-model="form.format"
              class="w-full rounded-lg border border-sand-7 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="championship">{{ t('eventsAdmin.show.formatChampionship') }}</option>
              <option value="pools">{{ t('eventsAdmin.show.formatPools') }}</option>
              <option value="knockout">{{ t('eventsAdmin.show.formatKnockout') }}</option>
            </select>
          </div>
          <label
            v-if="allowsThird"
            for="cat-third"
            class="flex items-center gap-2 text-sm text-sand-12"
          >
            <input
              id="cat-third"
              v-model="form.thirdPlace"
              type="checkbox"
              class="h-4 w-4 rounded border-sand-7 text-primary focus:ring-2 focus:ring-primary/30"
            />
            {{ t('eventsAdmin.show.thirdPlace') }}
          </label>
          <div v-if="needsPools">
            <label for="cat-pools" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('eventsAdmin.show.numPoolsLabel') }}
            </label>
            <input
              id="cat-pools"
              v-model.number="form.numPools"
              type="number"
              min="2"
              max="64"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.numPools }"
            />
            <p v-if="form.errors.numPools" class="mt-1 text-sm text-red-700">
              {{ form.errors.numPools }}
            </p>
          </div>
          <button
            type="submit"
            :disabled="form.processing"
            class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{
              form.processing
                ? t('eventsAdmin.show.adding')
                : t('eventsAdmin.show.addCategorySubmit')
            }}
          </button>
        </form>
      </section>
    </div>

    <!-- Catégories -->
    <section class="mt-6 rounded-2xl border border-sand-6 bg-white p-6">
      <h2 class="mb-4 text-base font-semibold text-sand-12">
        {{ t('eventsAdmin.show.categoriesHeading') }}
        <span class="text-sand-10">({{ categories.length }})</span>
      </h2>

      <div
        v-if="categories.length === 0"
        class="rounded-lg border border-dashed border-sand-7 px-4 py-8 text-center text-sm text-sand-11"
      >
        {{ t('eventsAdmin.show.categoriesEmpty') }}
      </div>

      <ul v-else class="divide-y divide-sand-5">
        <li v-for="c in categories" :key="c.id" class="flex flex-wrap items-center gap-3 py-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate font-medium text-sand-12">{{ c.name }}</span>
              <StatusBadge :status="c.status" />
            </div>
            <p class="text-sm text-sand-11">
              {{ c.category }} · {{ formatLabels[c.format] ?? c.format }} ·
              {{ t('eventsAdmin.show.teams', { count: c.teamsCount ?? 0 }) }}
              <span v-if="(c.teamsCount ?? 0) < 2" class="text-amber-700">
                {{ t('eventsAdmin.show.addAtLeast2') }}
              </span>
            </p>
          </div>
          <Link
            :href="`/tournaments/${c.id}`"
            class="text-sm font-medium text-primary hover:underline"
          >
            {{ t('eventsAdmin.show.manageTeams') }}
          </Link>
          <button
            type="button"
            class="text-sm font-medium text-red-700 hover:underline"
            @click="destroyCategory(c)"
          >
            {{ t('eventsAdmin.show.delete') }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Planning combiné -->
    <section class="mt-6 rounded-2xl border border-sand-6 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-sand-12">
            {{ t('eventsAdmin.show.combinedSchedule') }}
          </h2>
          <p v-if="planning" class="mt-0.5 text-sm text-sand-11">
            {{
              t('eventsAdmin.show.planningSummary', {
                matches: planning.matchCount,
                slots: planning.slotsCount,
                terrains: planning.numTerrains,
                start: planning.startTime,
                end: planning.endTime,
              })
            }}
          </p>
        </div>
        <Link
          v-if="canGenerate"
          :href="`/events/${event.id}/planning`"
          :class="
            planning
              ? 'rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12'
              : 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700'
          "
        >
          {{ planning ? t('eventsAdmin.show.regenerate') : t('eventsAdmin.show.generate') }}
        </Link>
      </div>

      <!-- Onglets par catégorie -->
      <template v-if="planning && planning.categories.length">
        <div class="mb-4 flex flex-wrap gap-2 border-b border-sand-5">
          <button
            v-for="c in planning.categories"
            :key="c.categoryId"
            type="button"
            class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition"
            :class="
              activeCategory === c.categoryId
                ? 'border-primary text-primary'
                : 'border-transparent text-sand-11 hover:text-sand-12'
            "
            @click="activeCategory = c.categoryId"
          >
            {{ c.name }}
          </button>
        </div>
        <PlanningGrid v-if="activePlanning" :slots="activePlanning.planning.slots" show-scores />
      </template>

      <!-- Pas encore de planning -->
      <div v-else class="rounded-lg border border-dashed border-sand-7 px-4 py-8 text-center">
        <p v-if="!canGenerate" class="text-sm text-sand-11">
          {{ t('eventsAdmin.show.needTwoTeams') }}
        </p>
        <p v-else class="text-sm text-sand-11">{{ t('eventsAdmin.show.noPlanning') }}</p>
      </div>
    </section>
  </AdminLayout>
</template>
