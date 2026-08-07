<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'

/**
 * Mise en page des pages légales (mentions, CGU, confidentialité) — accessible
 * sans authentification. En-tête minimal + contenu lisible + pied de page commun
 * (cf. CLAUDE.md §10 · issue #36). Le titre est passé par la page.
 */
defineProps<{ title: string; updatedAt?: string }>()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-sand-2 text-sand-12">
    <a
      href="#content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      Aller au contenu
    </a>

    <header class="border-b border-sand-6 bg-white">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" class="flex items-center gap-2 font-bold text-sand-12">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">F</span>
          <span class="text-lg tracking-tight">Fixtura</span>
        </Link>
        <Link href="/" class="text-sm font-medium text-sand-11 hover:text-sand-12 hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    </header>

    <main id="content" class="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div class="rounded-2xl border border-sand-6 bg-white p-6 sm:p-8">
        <h1 class="text-2xl font-bold tracking-tight text-sand-12 sm:text-3xl">{{ title }}</h1>
        <p v-if="updatedAt" class="mt-1 text-sm text-sand-10">
          Dernière mise à jour : {{ updatedAt }}
        </p>

        <div class="legal-prose mt-6 space-y-5 text-[0.95rem] leading-relaxed text-sand-11">
          <slot />
        </div>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
/* Rythme et hiérarchie de lecture pour un contenu purement textuel. */
.legal-prose :deep(h2) {
  margin-top: 1.75rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-sand-12);
}
.legal-prose :deep(h3) {
  margin-top: 1.25rem;
  font-weight: 600;
  color: var(--color-sand-12);
}
.legal-prose :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}
.legal-prose :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.legal-prose :deep(li) {
  margin-top: 0.35rem;
}
.legal-prose :deep(strong) {
  color: var(--color-sand-12);
}
</style>
