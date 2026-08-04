<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentStatus } from '~/app/types'

const props = defineProps<{ status: TournamentStatus }>()

const map: Record<TournamentStatus, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-sand-4 text-sand-11' },
  scheduled: { label: 'Planifié', cls: 'bg-blue-100 text-blue-800' },
  live: { label: 'En direct', cls: 'bg-primary-100 text-primary-800' },
  finished: { label: 'Terminé', cls: 'bg-sand-12 text-sand-1' },
}

const cfg = computed(() => map[props.status])
</script>

<template>
  <span
    :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.cls]"
  >
    {{ cfg.label }}
  </span>
</template>
