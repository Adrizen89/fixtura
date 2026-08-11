<script setup lang="ts">
import StandingsTable from '~/components/StandingsTable.vue'
import type { PoolStanding } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

/** Classements par poule — une table par poule, réutilise `StandingsTable`. */
defineProps<{ pools: PoolStanding[] }>()
</script>

<template>
  <div class="space-y-6">
    <div v-for="pool in pools" :key="pool.label">
      <h3 class="mb-2 text-sm font-bold uppercase tracking-wide text-sand-11">
        {{ t('poolStandings.pool', { label: pool.label }) }}
      </h3>
      <StandingsTable :standings="pool.standings" />
    </div>
  </div>
</template>
