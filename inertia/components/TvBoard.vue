<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  ResultMatchRow,
  StandingRow,
  PoolStanding,
  PublicClub,
  TournamentStatus,
  TournamentFormat,
} from '~/app/types'

/**
 * Mode TV de l'écran public (issue #40) : affichage plein écran, **très gros
 * contrastes et typographies** (fond sombre, texte clair), pensé pour un
 * vidéoprojecteur / une TV vue de loin (§8, §9). Rotation automatique entre le
 * planning et le classement, sans aucune interaction. Les données live (matchs,
 * classement) arrivent du parent, déjà rafraîchies en SSE — aucune requête ici.
 */
const props = defineProps<{
  tournament: { name: string; category: string; status: TournamentStatus; format: TournamentFormat }
  club: PublicClub
  matches: ResultMatchRow[]
  standings: StandingRow[]
  pools: PoolStanding[]
  liveState: string
}>()

const DEFAULT_ACCENT = '#16a34a'
const ROTATE_MS = 12000

const accent = computed(() => props.club.primaryColor || DEFAULT_ACCENT)

const showPools = computed(() => props.pools.length > 0)

/** Panneaux en rotation : planning puis classement. */
const panels = ['planning', 'standings'] as const
const panelIndex = ref(0)
const currentPanel = computed(() => panels[panelIndex.value])
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    panelIndex.value = (panelIndex.value + 1) % panels.length
  }, ROTATE_MS)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/** Matchs regroupés par créneau horaire. */
const slots = computed(() => {
  const byTime = new Map<string, ResultMatchRow[]>()
  for (const m of props.matches) {
    const bucket = byTime.get(m.time) ?? []
    bucket.push(m)
    byTime.set(m.time, bucket)
  }
  return [...byTime.entries()].map(([time, matches]) => ({ time, matches }))
})

const globalStandings = computed(() => props.standings.filter((r) => r.played > 0))

const statusLabel: Record<TournamentStatus, string> = {
  draft: 'À venir',
  scheduled: 'À venir',
  live: 'En direct',
  finished: 'Terminé',
}

function isFinished(m: ResultMatchRow) {
  return m.homeScore !== null && m.awayScore !== null
}
</script>

<template>
  <div
    class="tv-board min-h-screen w-full bg-[#0b0b0c] px-[3vw] py-[3vh] text-white"
    :style="{ '--accent': accent }"
  >
    <!-- En-tête : logo + club + tournoi + statut -->
    <header class="flex items-center justify-between gap-6 border-b-2 border-white/15 pb-[2vh]">
      <div class="flex min-w-0 items-center gap-[2vw]">
        <img
          v-if="club.logo"
          :src="club.logo"
          alt=""
          class="h-[9vh] w-[9vh] shrink-0 rounded-2xl object-contain"
        />
        <div class="min-w-0">
          <div class="truncate text-[2vh] font-semibold uppercase tracking-widest text-white/60">
            {{ club.name }}
          </div>
          <h1 class="truncate text-[5.5vh] font-extrabold leading-tight">
            {{ tournament.name }}
          </h1>
          <div class="text-[2.6vh] text-white/70">{{ tournament.category }}</div>
        </div>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-[1.5vh]">
        <span
          class="rounded-full px-[1.6vw] py-[1vh] text-[2.4vh] font-black uppercase tracking-wide"
          :style="
            tournament.status === 'live'
              ? { backgroundColor: 'var(--accent)', color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }
          "
        >
          {{ statusLabel[tournament.status] }}
        </span>
        <span class="flex items-center gap-2 text-[2vh] text-white/50">
          <span
            class="h-[1.6vh] w-[1.6vh] rounded-full"
            :style="{ backgroundColor: liveState === 'connected' ? 'var(--accent)' : '#666' }"
          />
          {{ currentPanel === 'planning' ? 'Planning' : 'Classement' }}
        </span>
      </div>
    </header>

    <!-- Panneau : PLANNING -->
    <main v-if="currentPanel === 'planning'" class="pt-[3vh]">
      <div v-if="slots.length" class="grid grid-cols-1 gap-[2.5vh] lg:grid-cols-2">
        <div v-for="slot in slots" :key="slot.time">
          <div class="mb-[1vh] text-[3vh] font-black" :style="{ color: 'var(--accent)' }">
            {{ slot.time }}
          </div>
          <ul class="space-y-[1vh]">
            <li
              v-for="m in slot.matches"
              :key="m.id"
              class="flex items-center gap-[1.2vw] rounded-xl bg-white/[0.06] px-[1.4vw] py-[1.2vh] text-[3vh]"
            >
              <span class="w-[4vw] shrink-0 text-[2.2vh] font-semibold text-white/50">
                T{{ m.terrainNumber }}
              </span>
              <span class="min-w-0 flex-1 truncate text-right font-semibold">{{ m.homeTeam }}</span>
              <span
                class="shrink-0 rounded-lg px-[1vw] py-[0.4vh] text-center font-black tabular-nums"
                :style="
                  isFinished(m)
                    ? { backgroundColor: '#fff', color: '#0b0b0c' }
                    : { color: 'rgba(255,255,255,0.5)' }
                "
              >
                <template v-if="isFinished(m)">{{ m.homeScore }} – {{ m.awayScore }}</template>
                <template v-else>vs</template>
              </span>
              <span class="min-w-0 flex-1 truncate font-semibold">{{ m.awayTeam }}</span>
            </li>
          </ul>
        </div>
      </div>
      <p v-else class="pt-[10vh] text-center text-[4vh] text-white/50">Planning à venir</p>
    </main>

    <!-- Panneau : CLASSEMENT -->
    <main v-else class="pt-[3vh]">
      <!-- Poules / hybride : une colonne par poule -->
      <div v-if="showPools" class="grid grid-cols-1 gap-[3vh] lg:grid-cols-2">
        <div v-for="pool in pools" :key="pool.label">
          <h2 class="mb-[1vh] text-[3.2vh] font-black" :style="{ color: 'var(--accent)' }">
            Poule {{ pool.label }}
          </h2>
          <table class="w-full text-[3vh]">
            <tbody>
              <tr v-for="row in pool.standings" :key="row.teamId" class="border-b border-white/10">
                <td class="w-[4vw] py-[1vh] font-black" :style="{ color: 'var(--accent)' }">
                  {{ row.rank }}
                </td>
                <td class="py-[1vh] font-semibold">{{ row.teamName }}</td>
                <td class="py-[1vh] text-right font-black tabular-nums">{{ row.points }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Championnat / autres : classement global -->
      <table v-else-if="globalStandings.length" class="w-full text-[3.4vh]">
        <thead>
          <tr class="text-[2.2vh] uppercase tracking-wide text-white/50">
            <th class="w-[5vw] py-[1vh] text-left">#</th>
            <th class="py-[1vh] text-left">Équipe</th>
            <th class="w-[8vw] py-[1vh] text-center">J</th>
            <th class="w-[8vw] py-[1vh] text-center">Diff</th>
            <th class="w-[10vw] py-[1vh] text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in globalStandings" :key="row.teamId" class="border-b border-white/10">
            <td class="py-[1.2vh]">
              <span
                class="inline-grid h-[5vh] w-[5vh] place-items-center rounded-full text-[2.6vh] font-black"
                :style="
                  row.rank <= 3
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }
                "
              >
                {{ row.rank }}
              </span>
            </td>
            <td class="py-[1.2vh] font-bold">{{ row.teamName }}</td>
            <td class="py-[1.2vh] text-center tabular-nums text-white/70">{{ row.played }}</td>
            <td class="py-[1.2vh] text-center tabular-nums text-white/70">
              {{ row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference }}
            </td>
            <td
              class="py-[1.2vh] text-right text-[4vh] font-black tabular-nums"
              :style="{ color: 'var(--accent)' }"
            >
              {{ row.points }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="pt-[10vh] text-center text-[4vh] text-white/50">Classement à venir</p>
    </main>

    <!-- Indicateur de rotation -->
    <footer
      class="pointer-events-none fixed inset-x-0 bottom-[2vh] flex justify-center gap-[1.2vw]"
    >
      <span
        v-for="(panel, i) in panels"
        :key="panel"
        class="h-[1.2vh] w-[1.2vh] rounded-full transition"
        :style="{
          backgroundColor: i === panelIndex ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
        }"
      />
    </footer>
  </div>
</template>
