<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentStatus } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const props = defineProps<{ status: TournamentStatus }>()

const { t } = useI18n()

const classMap: Record<TournamentStatus, string> = {
  draft: 'bg-sand-4 text-sand-11',
  scheduled: 'bg-blue-100 text-blue-800',
  live: 'bg-primary-100 text-primary-800',
  finished: 'bg-sand-12 text-sand-1',
}

const cfg = computed(() => ({
  label: t(`statusBadge.${props.status}`),
  cls: classMap[props.status],
}))
</script>

<template>
  <span
    :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.cls]"
  >
    {{ cfg.label }}
  </span>
</template>
