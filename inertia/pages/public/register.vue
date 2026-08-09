<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link, useForm, usePage } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import type { FlashMessages } from '~/app/types'

/**
 * Formulaire public d'inscription d'une équipe à un tournoi (issue #112).
 * Sans compte, sans paiement. Selon l'état : formulaire ouvert, « complet » ou
 * « fermé ». Données minimales (nom + contact) + mention RGPD (§10).
 */
const props = defineProps<{
  tournament: { name: string; category: string; eventDate: string | null }
  club: { name: string }
  status: 'closed' | 'open' | 'full'
  remaining: number | null
}>()

const page = usePage()
const flash = computed(() => page.props.flash as FlashMessages | undefined)

const form = useForm({
  name: '',
  contactEmail: '',
  // Honeypot anti-spam : doit rester vide (masqué aux humains).
  website: '',
})

function submit() {
  form.post(window.location.pathname, {
    preserveScroll: true,
    onSuccess: () => form.reset('name', 'contactEmail', 'website'),
  })
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <Head :title="`Inscription — ${tournament.name}`" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span
            class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-white"
          >
            F
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ tournament.name }}</h1>
          <p class="mt-1 text-sm text-sand-11">
            {{ tournament.category }}
            <template v-if="tournament.eventDate">
              · {{ formatDate(tournament.eventDate) }}</template
            >
            <br />
            <span class="text-sand-10">Organisé par {{ club.name }}</span>
          </p>
        </div>

        <div class="rounded-2xl border border-sand-6 bg-white p-6 shadow-sm">
          <!-- Message de confirmation (après inscription) -->
          <div
            v-if="flash?.success"
            class="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
            role="status"
          >
            {{ flash.success }}
          </div>
          <div
            v-if="flash?.error"
            class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {{ flash.error }}
          </div>

          <!-- Inscriptions fermées -->
          <div v-if="status === 'closed'" class="py-6 text-center">
            <p class="text-sand-12">Les inscriptions ne sont pas ouvertes pour ce tournoi.</p>
            <p class="mt-1 text-sm text-sand-11">Revenez plus tard ou contactez l'organisateur.</p>
          </div>

          <!-- Tournoi complet -->
          <div v-else-if="status === 'full'" class="py-6 text-center">
            <p class="text-sand-12">Le tournoi est complet.</p>
            <p class="mt-1 text-sm text-sand-11">
              Toutes les places sont prises. Contactez l'organisateur en cas de désistement.
            </p>
          </div>

          <!-- Formulaire ouvert -->
          <form v-else class="space-y-4" @submit.prevent="submit">
            <p v-if="remaining !== null" class="text-sm text-sand-11">
              {{ remaining }} place(s) restante(s).
            </p>

            <div>
              <label for="name" class="mb-1 block text-sm font-medium text-sand-12">
                Nom de l'équipe
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                maxlength="60"
                autocomplete="off"
                autofocus
                class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                :class="{ 'border-red-400': form.errors.name }"
              />
              <p v-if="form.errors.name" class="mt-1 text-sm text-red-700">
                {{ form.errors.name }}
              </p>
            </div>

            <div>
              <label for="contactEmail" class="mb-1 block text-sm font-medium text-sand-12">
                E-mail de contact
              </label>
              <input
                id="contactEmail"
                v-model="form.contactEmail"
                type="email"
                required
                autocomplete="email"
                class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                :class="{ 'border-red-400': form.errors.contactEmail }"
              />
              <p v-if="form.errors.contactEmail" class="mt-1 text-sm text-red-700">
                {{ form.errors.contactEmail }}
              </p>
            </div>

            <!-- Honeypot anti-spam : invisible aux humains, ignoré des lecteurs d'écran. -->
            <div aria-hidden="true" class="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label for="website">Ne pas remplir</label>
              <input
                id="website"
                v-model="form.website"
                type="text"
                tabindex="-1"
                autocomplete="off"
              />
            </div>

            <button
              type="submit"
              :disabled="form.processing"
              class="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ form.processing ? 'Inscription…' : 'Inscrire mon équipe' }}
            </button>

            <!-- Mention RGPD (§10) : données minimales + finalité + lien politique. -->
            <p class="text-xs leading-relaxed text-sand-10">
              Le nom de l'équipe et l'e-mail de contact sont utilisés uniquement pour organiser ce
              tournoi et vous informer. Voir notre
              <Link href="/confidentialite" class="font-medium text-primary hover:underline">
                politique de confidentialité</Link
              >.
            </p>
          </form>
        </div>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
