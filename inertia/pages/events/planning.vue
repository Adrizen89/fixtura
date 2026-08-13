<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import PlanningGrid from '~/components/PlanningGrid.vue'
import { useI18n } from '~/composables/i18n'
import type { EventItem, EventPlanningView } from '~/app/types'

const { t } = useI18n()

const props = defineProps<{
  event: EventItem
  preview: EventPlanningView
  hasExistingPlanning: boolean
}>()

const showHref = `/events/${props.event.id}`

const activeCategory = ref<number | null>(props.preview.categories[0]?.categoryId ?? null)
const activePlanning = computed(
  () => props.preview.categories.find((c) => c.categoryId === activeCategory.value) ?? null
)

function validate() {
  if (props.hasExistingPlanning && !confirm(t('eventsAdmin.planning.confirmValidate'))) {
    return
  }
  router.post(`/events/${props.event.id}/planning`)
}
</script>

<template>
  <Head :title="t('eventsAdmin.planning.headTitle', { name: event.name })" />

  <AdminLayout>
    <div class="mb-6">
      <Link :href="showHref" class="text-sm text-sand-11 hover:text-sand-12">
        ← {{ event.name }}
      </Link>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('eventsAdmin.planning.title') }}
      </h1>
      <p class="mt-1 text-sand-11">
        {{ t('eventsAdmin.planning.subtitle') }}
      </p>
    </div>

    <!-- Avertissement régénération -->
    <div
      v-if="hasExistingPlanning"
      class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="alert"
    >
      {{ t('eventsAdmin.planning.regenWarning') }}
    </div>

    <!-- Résumé -->
    <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-sand-6 bg-surface p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('eventsAdmin.planning.matches') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.matchCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-surface p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('eventsAdmin.planning.categories') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.categories.length }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-surface p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('eventsAdmin.planning.slots') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold text-sand-12">{{ preview.slotsCount }}</dd>
      </div>
      <div class="rounded-xl border border-sand-6 bg-surface p-4">
        <dt class="text-xs uppercase tracking-wide text-sand-9">
          {{ t('eventsAdmin.planning.timeRange') }}
        </dt>
        <dd class="mt-0.5 text-xl font-semibold tabular-nums text-sand-12">
          {{ preview.startTime }}–{{ preview.endTime }}
        </dd>
      </div>
    </div>

    <!-- Grille par catégorie -->
    <section class="rounded-2xl border border-sand-6 bg-surface p-6">
      <div class="mb-4 flex flex-wrap gap-2 border-b border-sand-5">
        <button
          v-for="c in preview.categories"
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
          <span class="text-sand-9">({{ c.planning.matchCount }})</span>
        </button>
      </div>
      <PlanningGrid v-if="activePlanning" :slots="activePlanning.planning.slots" />
    </section>

    <!-- Actions -->
    <div class="mt-6 flex items-center justify-end gap-3">
      <Link
        :href="showHref"
        class="rounded-lg border border-sand-7 px-4 py-2.5 font-medium text-sand-11 transition hover:bg-sand-3"
      >
        {{ t('eventsAdmin.planning.cancel') }}
      </Link>
      <button
        type="button"
        class="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        @click="validate"
      >
        {{ t('eventsAdmin.planning.validate') }}
      </button>
    </div>
  </AdminLayout>
</template>
