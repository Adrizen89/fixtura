<script setup lang="ts">
import type { StandingRow } from '~/app/types'

defineProps<{ standings: StandingRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        Classement du tournoi : rang, équipe, matchs joués, gagnés, nuls, perdus, buts pour et
        contre, différence de buts et points.
      </caption>
      <thead>
        <tr class="border-b border-sand-6 text-xs uppercase tracking-wide text-sand-9">
          <th scope="col" class="py-2 pr-2 text-left font-medium">#</th>
          <th scope="col" class="py-2 pr-4 text-left font-medium">Équipe</th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Joués">
            J<span class="sr-only"> — matchs joués</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Gagnés">
            G<span class="sr-only"> — gagnés</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Nuls">
            N<span class="sr-only"> — nuls</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Perdus">
            P<span class="sr-only"> — perdus</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Buts pour">
            BP<span class="sr-only"> — buts pour</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Buts contre">
            BC<span class="sr-only"> — buts contre</span>
          </th>
          <th scope="col" class="py-2 px-2 text-center font-medium" title="Différence de buts">
            Diff<span class="sr-only"> — différence de buts</span>
          </th>
          <th scope="col" class="py-2 pl-2 text-center font-semibold text-sand-11" title="Points">
            Pts<span class="sr-only"> — points</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in standings" :key="row.teamId" class="border-b border-sand-4 last:border-0">
          <td class="py-2 pr-2 text-left tabular-nums text-sand-11">{{ row.rank }}</td>
          <th scope="row" class="py-2 pr-4 text-left font-medium text-sand-12">
            {{ row.teamName }}
          </th>
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
