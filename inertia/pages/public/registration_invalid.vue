<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import { useI18n } from '~/composables/i18n'

/**
 * Lien d'inscription invalide (issue #112) : jeton introuvable (fautif, révoqué…).
 * On reste volontairement vague — aucune information sur l'existence d'un tournoi.
 */
const { t } = useI18n()
</script>

<template>
  <Head :title="t('publicRegister.invalidHeadTitle')" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md text-center">
        <span
          class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-sand-4 text-xl font-bold text-sand-11"
        >
          !
        </span>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">
          {{ t('publicRegister.invalidTitle') }}
        </h1>
        <p class="mt-3 text-sand-11">
          {{ t('publicRegister.invalidBody') }}
        </p>

        <Link
          href="/"
          class="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
        >
          {{ t('common.backHome') }}
        </Link>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
