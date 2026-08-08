<script setup lang="ts">
import { computed } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import type { AuthUser, CurrentClub, FlashMessages } from '~/app/types'

const page = usePage()
const user = computed(() => page.props.auth as AuthUser | null)
const currentClub = computed(() => page.props.currentClub as CurrentClub | null)
const flash = computed(() => page.props.flash as FlashMessages | undefined)

/** Libellé lisible du rôle (contexte multi-tenant — issue #34). */
const roleLabel = computed(() => (user.value?.role === 'owner' ? 'Responsable' : 'Organisateur'))

function logout() {
  router.post('/logout')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-sand-2 text-sand-12">
    <!-- Lien d'évitement : premier élément focusable, visible uniquement au clavier. -->
    <a
      href="#content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      Aller au contenu
    </a>

    <header class="border-b border-sand-6 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div class="flex items-center gap-6">
          <Link href="/tournaments" class="flex items-center gap-2 font-bold text-sand-12">
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">F</span>
            <span class="text-lg tracking-tight">Fixtura</span>
          </Link>
          <nav v-if="user" class="flex items-center gap-4 text-sm font-medium">
            <Link href="/events" class="text-sand-11 transition hover:text-sand-12"
              >Événements</Link
            >
            <Link href="/tournaments" class="text-sand-11 transition hover:text-sand-12"
              >Tournois</Link
            >
            <!-- Gestion des membres — réservée au responsable (issue #35). -->
            <Link
              v-if="user.role === 'owner'"
              href="/membres"
              class="text-sand-11 transition hover:text-sand-12"
              >Membres</Link
            >
            <!-- Personnalisation de l'écran public — responsable (issue #40). -->
            <Link
              v-if="user.role === 'owner'"
              href="/club/apparence"
              class="text-sand-11 transition hover:text-sand-12"
              >Apparence</Link
            >
          </nav>
        </div>

        <div v-if="user" class="flex items-center gap-3 text-sm">
          <!-- Club courant (contexte multi-tenant — issue #34). -->
          <span
            v-if="currentClub"
            class="hidden items-center gap-1.5 rounded-full bg-sand-3 px-2.5 py-1 font-medium text-sand-12 md:inline-flex"
            :aria-label="`Club courant : ${currentClub.name}`"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {{ currentClub.name }}
          </span>
          <span class="hidden text-right leading-tight text-sand-11 sm:block">
            <span class="block">{{ user.email }}</span>
            <span class="block text-xs text-sand-9">{{ roleLabel }}</span>
          </span>
          <button
            type="button"
            class="rounded-md border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="logout"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>

    <!-- Bannières flash (région live pour les lecteurs d'écran). -->
    <div
      v-if="flash?.success || flash?.error"
      class="mx-auto max-w-6xl px-4 pt-4"
      aria-live="polite"
    >
      <div
        v-if="flash?.success"
        class="rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800"
        role="status"
      >
        {{ flash.success }}
      </div>
      <div
        v-if="flash?.error"
        class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        {{ flash.error }}
      </div>
    </div>

    <main id="content" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
