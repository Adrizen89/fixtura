<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import type { EditionResult, TeamRecord, TournamentFormat } from '~/app/types'

/**
 * Palmarès (issue #109) — vue admin agrégée sur l'historique du club :
 *  - bilan cumulé par équipe (participations, victoires, ratio) ;
 *  - vainqueur / finaliste de chaque édition terminée.
 * Données calculées à la volée (service pur `computePalmares`), jamais stockées.
 */
const props = defineProps<{ editions: EditionResult[]; teamRecords: TeamRecord[] }>()

const isEmpty = computed(() => props.editions.length === 0)

const formatLabel: Record<TournamentFormat, string> = {
  championship: 'Championnat',
  pools: 'Poules',
  knockout: 'Élimination directe',
  hybrid: 'Poules + tableau',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function winRatePct(rate: number) {
  return `${Math.round(rate * 100)} %`
}
</script>

<template>
  <Head title="Palmarès" />

  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-sand-12">Palmarès</h1>
      <p class="mt-1 text-sm text-sand-11">
        Vainqueurs de chaque édition et bilan cumulé des équipes sur tout l'historique du club.
      </p>
    </div>

    <!-- État vide -->
    <div
      v-if="isEmpty"
      class="rounded-2xl border border-dashed border-sand-7 bg-white p-12 text-center"
    >
      <p class="text-sand-11">Aucune édition terminée pour le moment.</p>
      <p class="mt-1 text-sm text-sand-9">
        Le palmarès se construit dès qu'un tournoi ou un événement est terminé.
      </p>
    </div>

    <template v-else>
      <!-- Bilan cumulé par équipe -->
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-sand-12">Bilan par équipe</h2>
        <div class="overflow-x-auto rounded-2xl border border-sand-6 bg-white">
          <table class="w-full border-collapse text-sm">
            <caption class="sr-only">
              Bilan cumulé par équipe : rang, nom, participations, victoires, finales et ratio de
              victoires.
            </caption>
            <thead>
              <tr
                class="border-b border-sand-6 text-left text-xs uppercase tracking-wide text-sand-10"
              >
                <th scope="col" class="py-3 pl-4 pr-2 font-semibold">#</th>
                <th scope="col" class="py-3 pr-3 font-semibold">Équipe</th>
                <th scope="col" class="py-3 px-2 text-center font-semibold" title="Participations">
                  Part.<span class="sr-only"> — participations</span>
                </th>
                <th scope="col" class="py-3 px-2 text-center font-semibold">Finales</th>
                <th scope="col" class="py-3 px-2 text-center font-semibold">Titres</th>
                <th scope="col" class="py-3 pl-2 pr-4 text-center font-semibold">Ratio</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in teamRecords"
                :key="r.teamName"
                class="border-b border-sand-4 last:border-0"
              >
                <td class="py-2.5 pl-4 pr-2 text-center align-middle">
                  <span
                    class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    :class="
                      r.wins > 0 && i === 0 ? 'bg-primary text-white' : 'bg-sand-3 text-sand-11'
                    "
                  >
                    {{ i + 1 }}
                  </span>
                </td>
                <th scope="row" class="py-2.5 pr-3 text-left font-semibold text-sand-12">
                  {{ r.teamName }}
                </th>
                <td class="py-2.5 px-2 text-center tabular-nums text-sand-11">
                  {{ r.participations }}
                </td>
                <td class="py-2.5 px-2 text-center tabular-nums text-sand-11">{{ r.finals }}</td>
                <td class="py-2.5 px-2 text-center tabular-nums font-bold text-sand-12">
                  {{ r.wins }}
                </td>
                <td class="py-2.5 pl-2 pr-4 text-center tabular-nums text-sand-11">
                  {{ winRatePct(r.winRate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Vainqueurs par édition -->
      <section>
        <h2 class="mb-4 text-lg font-semibold text-sand-12">Vainqueurs par édition</h2>
        <ul class="space-y-3">
          <li
            v-for="e in editions"
            :key="e.tournamentId"
            class="rounded-2xl border border-sand-6 bg-white p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold text-sand-12">
                  {{ e.name }} <span class="font-normal text-sand-11">· {{ e.category }}</span>
                </p>
                <p class="mt-0.5 text-xs text-sand-9">
                  {{ formatDate(e.eventDate) }} · {{ formatLabel[e.format] ?? e.format }}
                </p>
              </div>
              <div class="flex flex-col gap-1 text-sm sm:items-end">
                <span v-if="e.winner" class="font-semibold text-sand-12">
                  <span aria-hidden="true">🏆</span> {{ e.winner.teamName }}
                </span>
                <span v-else class="text-sand-9">Vainqueur non déterminé</span>
                <span v-if="e.finalist" class="text-xs text-sand-11">
                  Finaliste : {{ e.finalist.teamName }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </AdminLayout>
</template>
