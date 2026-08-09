<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'

/**
 * Lien d'inscription invalide (issue #112) : jeton introuvable (fautif, révoqué…).
 * On reste volontairement vague — aucune information sur l'existence d'un tournoi.
 */
</script>

<template>
  <Head title="Lien d'inscription invalide" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md text-center">
        <span
          class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-sand-4 text-xl font-bold text-sand-11"
        >
          !
        </span>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">Lien indisponible</h1>
        <p class="mt-3 text-sand-11">
          Ce lien d'inscription est invalide ou n'existe plus. Vérifiez l'adresse ou demandez un
          nouveau lien à l'organisateur.
        </p>

        <Link
          href="/"
          class="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
