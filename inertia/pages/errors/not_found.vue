<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()
</script>

<template>
  <Head :title="t('errors.notFoundTitle')" />

  <main
    class="flex min-h-screen flex-col items-center justify-center bg-sand-2 px-4 py-12 text-center"
  >
    <p class="text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">404</p>
    <h1 class="mt-4 text-2xl font-bold tracking-tight text-sand-12">
      {{ t('errors.notFoundTitle') }}
    </h1>
    <p class="mt-2 max-w-md text-sand-11">{{ t('errors.notFoundBody') }}</p>
    <Link
      href="/"
      class="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {{ t('common.backHome') }}
    </Link>
  </main>
</template>
