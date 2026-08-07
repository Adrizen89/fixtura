<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'

/**
 * Lien d'invitation invalide (issue #35) : introuvable, déjà accepté ou expiré.
 */
const props = defineProps<{ reason: 'not_found' | 'accepted' | 'expired' }>()

const message = computed(() => {
  switch (props.reason) {
    case 'accepted':
      return 'Cette invitation a déjà été acceptée. Connectez-vous avec votre compte.'
    case 'expired':
      return 'Cette invitation a expiré. Demandez au responsable du club de vous en renvoyer une.'
    default:
      return "Ce lien d'invitation est invalide ou n'existe plus."
  }
})
</script>

<template>
  <Head title="Invitation invalide" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md text-center">
        <span
          class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-sand-4 text-xl font-bold text-sand-11"
        >
          !
        </span>
        <h1 class="text-2xl font-bold tracking-tight text-sand-12">Invitation indisponible</h1>
        <p class="mt-3 text-sand-11">{{ message }}</p>

        <Link
          href="/login"
          class="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
        >
          Aller à la connexion
        </Link>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
