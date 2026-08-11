<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { router, useForm } from '@inertiajs/vue3'
import type { TeamRegistrationItem, Tournament } from '~/app/types'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

/**
 * Gestion des inscriptions en ligne d'un tournoi (issues #112 + #113) — côté
 * organisateur. Ouvre/ferme le formulaire public, fixe une capacité facultative et
 * donne le lien non devinable à partager. Depuis #113, les demandes reçues attendent
 * une décision : valider (→ crée l'équipe) ou refuser (→ archive). La « fermeture
 * pleine » est dérivée de l'occupation = équipes confirmées + demandes en attente.
 */
const props = defineProps<{ tournament: Tournament; registrations: TeamRegistrationItem[] }>()

const teamsCount = computed(() => props.tournament.teams?.length ?? 0)
const isOpen = computed(() => props.tournament.registrationOpen)
const capacity = computed(() => props.tournament.registrationCapacity)

const pending = computed(() => props.registrations.filter((r) => r.status === 'pending'))
const decided = computed(() => props.registrations.filter((r) => r.status !== 'pending'))
const pendingCount = computed(() => pending.value.length)

/** Occupation = équipes confirmées + demandes en attente (miroir du serveur). */
const occupancy = computed(() => teamsCount.value + pendingCount.value)
const isFull = computed(() => capacity.value !== null && occupancy.value >= capacity.value)

/**
 * URL du lien public d'inscription (jeton non devinable). L'origine est lue au montage
 * côté client (`window` n'existe pas au rendu SSR) : en SSR l'URL reste relative, puis
 * elle devient absolue après hydratation — copiable/partageable.
 */
const origin = ref('')
onMounted(() => (origin.value = window.location.origin))
const publicUrl = computed(() =>
  props.tournament.registrationToken
    ? `${origin.value}/inscription/${props.tournament.registrationToken}`
    : null
)

const form = useForm({
  open: props.tournament.registrationOpen,
  capacity: props.tournament.registrationCapacity as number | null,
})

function submit() {
  form.patch(`/tournaments/${props.tournament.id}/registration`, { preserveScroll: true })
}

function toggle(open: boolean) {
  form.open = open
  submit()
}

/** Décision sur une demande (#113). `deciding` verrouille les boutons de la ligne. */
const deciding = ref<number | null>(null)
function decide(registration: TeamRegistrationItem, action: 'approve' | 'reject') {
  deciding.value = registration.id
  router.post(
    `/tournaments/${props.tournament.id}/registrations/${registration.id}/${action}`,
    {},
    {
      preserveScroll: true,
      onFinish: () => (deciding.value = null),
    }
  )
}

const copied = ref(false)
async function copyLink() {
  if (!publicUrl.value) return
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="rounded-2xl border border-sand-6 bg-white p-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-sand-12">{{ t('registrationManager.title') }}</h2>
      <span
        v-if="isOpen && isFull"
        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
      >
        {{ t('registrationManager.full') }}
      </span>
      <span
        v-else-if="isOpen"
        class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
      >
        {{ t('registrationManager.open') }}
      </span>
      <span v-else class="rounded-full bg-sand-3 px-2 py-0.5 text-xs font-medium text-sand-11">
        {{ t('registrationManager.closed') }}
      </span>
    </div>

    <p class="mb-4 text-sm text-sand-11">
      {{ t('registrationManager.intro') }}
      <template v-if="capacity !== null">
        {{ t('registrationManager.occupancy', { occupancy, capacity }) }}
      </template>
      <template v-else> {{ t('registrationManager.confirmed', { count: teamsCount }) }} </template>
    </p>

    <!-- Réglages : capacité + ouverture -->
    <form class="space-y-3" @submit.prevent="submit">
      <div>
        <label for="reg-capacity" class="mb-1 block text-sm font-medium text-sand-12">
          {{ t('registrationManager.capacityLabel') }}
          <span class="font-normal text-sand-10">{{ t('registrationManager.capacityHint') }}</span>
        </label>
        <input
          id="reg-capacity"
          v-model.number="form.capacity"
          type="number"
          min="1"
          max="1000"
          :placeholder="t('registrationManager.unlimited')"
          class="w-40 rounded-lg border border-sand-7 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          :class="{ 'border-red-400': form.errors.capacity }"
        />
        <p v-if="form.errors.capacity" class="mt-1 text-sm text-red-700">
          {{ form.errors.capacity }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="!isOpen"
          type="button"
          :disabled="form.processing"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          @click="toggle(true)"
        >
          {{ t('registrationManager.openRegistration') }}
        </button>
        <template v-else>
          <button
            type="submit"
            :disabled="form.processing"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {{ t('registrationManager.saveCapacity') }}
          </button>
          <button
            type="button"
            :disabled="form.processing"
            class="rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 disabled:opacity-60"
            @click="toggle(false)"
          >
            {{ t('registrationManager.closeRegistration') }}
          </button>
        </template>
      </div>
    </form>

    <!-- Lien public à partager (visible dès qu'un jeton existe) -->
    <div v-if="publicUrl" class="mt-4 border-t border-sand-4 pt-4">
      <label
        for="reg-link"
        class="mb-1 block text-xs font-semibold uppercase tracking-wide text-sand-9"
      >
        {{ t('registrationManager.linkLabel') }}
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="reg-link"
          :value="publicUrl"
          readonly
          class="min-w-0 flex-1 rounded-lg border border-sand-6 bg-sand-2 px-3 py-2 text-sm text-sand-11 outline-none"
          @focus="(e) => (e.target as HTMLInputElement).select()"
        />
        <button
          type="button"
          class="shrink-0 rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
          @click="copyLink"
        >
          {{ copied ? t('registrationManager.copied') : t('registrationManager.copy') }}
        </button>
        <a
          :href="publicUrl"
          target="_blank"
          rel="noopener"
          class="shrink-0 rounded-lg border border-sand-7 px-3 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
        >
          {{ t('registrationManager.openLink') }} ↗
        </a>
      </div>
      <p v-if="!isOpen" class="mt-2 text-xs text-sand-10">
        {{ t('registrationManager.closedHint') }}
      </p>
    </div>

    <!-- Demandes d'inscription à traiter (#113) -->
    <div class="mt-4 border-t border-sand-4 pt-4">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-sand-12">
        {{ t('registrationManager.requestsTitle') }}
        <span
          v-if="pendingCount"
          class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        >
          {{ t('registrationManager.pendingBadge', { count: pendingCount }) }}
        </span>
      </h3>

      <p v-if="registrations.length === 0" class="text-sm text-sand-10">
        {{ t('registrationManager.noRequests') }}
      </p>

      <!-- En attente : validables / refusables -->
      <ul v-if="pending.length" class="space-y-2">
        <li
          v-for="reg in pending"
          :key="reg.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sand-6 bg-sand-1 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-sand-12">{{ reg.teamName }}</p>
            <p class="truncate text-xs text-sand-10">
              {{ reg.contactEmail }} · {{ formatDate(reg.createdAt) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              :disabled="deciding === reg.id"
              class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
              @click="decide(reg, 'approve')"
            >
              {{ t('registrationManager.approve') }}
            </button>
            <button
              type="button"
              :disabled="deciding === reg.id"
              class="rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 disabled:opacity-60"
              @click="decide(reg, 'reject')"
            >
              {{ t('registrationManager.reject') }}
            </button>
          </div>
        </li>
      </ul>

      <!-- Traitées : historique (validées / refusées) -->
      <div v-if="decided.length" class="mt-3">
        <details class="text-sm">
          <summary class="cursor-pointer text-sand-11 hover:text-sand-12">
            {{ t('registrationManager.processed', { count: decided.length }) }}
          </summary>
          <ul class="mt-2 space-y-1.5">
            <li
              v-for="reg in decided"
              :key="reg.id"
              class="flex flex-wrap items-center justify-between gap-2 px-1 text-sm"
            >
              <span class="min-w-0 truncate text-sand-11">
                {{ reg.teamName }}
                <span class="text-xs text-sand-9">· {{ reg.contactEmail }}</span>
              </span>
              <span
                v-if="reg.status === 'approved'"
                class="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
              >
                {{ t('registrationManager.approved') }}
              </span>
              <span
                v-else
                class="shrink-0 rounded-full bg-sand-3 px-2 py-0.5 text-xs font-medium text-sand-11"
              >
                {{ t('registrationManager.rejected') }}
              </span>
            </li>
          </ul>
        </details>
      </div>
    </div>
  </section>
</template>
