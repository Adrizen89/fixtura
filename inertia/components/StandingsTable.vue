<script setup lang="ts">
import type { StandingRow } from '~/app/types'

defineProps<{ standings: StandingRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-sand-6 text-xs uppercase tracking-wide text-sand-9">
          <th class="py-2 pr-2 text-left font-medium">#</th>
          <th class="py-2 pr-4 text-left font-medium">Équipe</th>
          <th class="py-2 px-2 text-center font-medium" title="Joués">J</th>
          <th class="py-2 px-2 text-center font-medium" title="Gagnés">G</th>
          <th class="py-2 px-2 text-center font-medium" title="Nuls">N</th>
          <th class="py-2 px-2 text-center font-medium" title="Perdus">P</th>
          <th class="py-2 px-2 text-center font-medium" title="Buts pour">BP</th>
          <th class="py-2 px-2 text-center font-medium" title="Buts contre">BC</th>
          <th class="py-2 px-2 text-center font-medium" title="Différence de buts">Diff</th>
          <th class="py-2 pl-2 text-center font-semibold text-sand-11" title="Points">Pts</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in standings" :key="row.teamId" class="border-b border-sand-4 last:border-0">
          <td class="py-2 pr-2 text-left tabular-nums text-sand-11">{{ row.rank }}</td>
          <td class="py-2 pr-4 text-left font-medium text-sand-12">{{ row.teamName }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.played }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.won }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.drawn }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.lost }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.goalsFor }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">{{ row.goalsAgainst }}</td>
          <td class="py-2 px-2 text-center tabular-nums text-sand-11">
            {{ row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference }}
          </td>
          <td class="py-2 pl-2 text-center font-bold tabular-nums text-sand-12">
            {{ row.points }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
