<script setup lang="ts">
import type { StandingRow } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

defineProps<{ standings: StandingRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{
          t('standings.caption')
        }}
      </caption>
      <thead>
        <tr class="border-b border-sand-6 text-xs uppercase tracking-wide text-sand-9">
          <th scope="col" class="py-2 pr-2 text-left font-medium">{{ t('standings.col.pos') }}</th>
          <th scope="col" class="py-2 pr-4 text-left font-medium">{{ t('standings.col.team') }}</th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.playedTitle')"
          >
            {{ t('standings.col.played')
            }}<span class="sr-only"> {{ t('standings.col.playedSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.wonTitle')"
          >
            {{ t('standings.col.won') }}<span class="sr-only"> {{ t('standings.col.wonSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.drawnTitle')"
          >
            {{ t('standings.col.drawn')
            }}<span class="sr-only"> {{ t('standings.col.drawnSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.lostTitle')"
          >
            {{ t('standings.col.lost')
            }}<span class="sr-only"> {{ t('standings.col.lostSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.goalsForTitle')"
          >
            {{ t('standings.col.goalsFor')
            }}<span class="sr-only"> {{ t('standings.col.goalsForSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.goalsAgainstTitle')"
          >
            {{ t('standings.col.goalsAgainst')
            }}<span class="sr-only"> {{ t('standings.col.goalsAgainstSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 px-2 text-center font-medium"
            :title="t('standings.col.goalDifferenceTitle')"
          >
            {{ t('standings.col.goalDifference')
            }}<span class="sr-only"> {{ t('standings.col.goalDifferenceSr') }}</span>
          </th>
          <th
            scope="col"
            class="py-2 pl-2 text-center font-semibold text-sand-11"
            :title="t('standings.col.pointsTitle')"
          >
            {{ t('standings.col.points')
            }}<span class="sr-only"> {{ t('standings.col.pointsSr') }}</span>
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
