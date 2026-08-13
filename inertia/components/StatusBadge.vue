<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentStatus } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const props = defineProps<{ status: TournamentStatus }>()

const { t } = useI18n()

/**
 * Badge de statut (refonte visuelle) : pastille de couleur + libellé, plus lisible
 * que la couleur seule et cohérent en thème clair comme sombre (couleurs via tokens).
 * Le statut « en direct » fait discrètement pulser sa pastille (désactivé si
 * l'utilisateur a demandé moins d'animations).
 */
const pillMap: Record<TournamentStatus, string> = {
  draft: 'bg-sand-3 text-sand-11',
  scheduled: 'bg-blue-100 text-blue-800',
  live: 'bg-primary-100 text-primary-800',
  finished: 'bg-sand-12 text-sand-1',
}

const dotMap: Record<TournamentStatus, string> = {
  draft: 'bg-sand-8',
  scheduled: 'bg-current',
  live: 'bg-primary animate-pulse motion-reduce:animate-none',
  finished: 'bg-current',
}

const cfg = computed(() => ({
  label: t(`statusBadge.${props.status}`),
  pill: pillMap[props.status],
  dot: dotMap[props.status],
}))
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-xs font-semibold',
      cfg.pill,
    ]"
  >
    <span :class="['h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot]" aria-hidden="true" />
    {{ cfg.label }}
  </span>
</template>
