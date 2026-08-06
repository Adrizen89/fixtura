<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
</script>

<template>
  <Head title="Page introuvable" />

  <main
    class="flex min-h-screen flex-col items-center justify-center bg-sand-2 px-4 py-12 text-center"
  >
    <p class="text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">404</p>
    <h1 class="mt-4 text-2xl font-bold tracking-tight text-sand-12">Page introuvable</h1>
    <p class="mt-2 max-w-md text-sand-11">
      Cette page n’existe pas ou a été déplacée. Vérifiez le lien, ou revenez à l’accueil.
    </p>
    <Link
      href="/"
      class="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      Retour à l’accueil
    </Link>
  </main>
</template>
