<script setup lang="ts">
import { computed } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import type { AuthUser } from '~/app/types'

/**
 * Pied de page commun (admin, connexion, écran public) — donne accès aux pages
 * légales requises avant l'ouverture publique (cf. CLAUDE.md §10 · issue #36).
 *
 * `variant="public"` : version très sobre et contrastée pour l'écran TV/mobile.
 * Pour l'`owner` connecté, un lien de portabilité RGPD (export JSON du club) est
 * ajouté — c'est un téléchargement (Content-Disposition), donc un `<a>` classique
 * et non un `<Link>` Inertia.
 */
withDefaults(defineProps<{ variant?: 'default' | 'public' }>(), {
  variant: 'default',
})

const page = usePage()
const user = computed(() => (page.props.auth as AuthUser | null) ?? null)
const isOwner = computed(() => user.value?.role === 'owner')

const year = new Date().getFullYear()
</script>

<template>
  <footer
    class="border-t"
    :class="
      variant === 'public' ? 'border-sand-6 text-sand-9' : 'border-sand-6 bg-white text-sand-11'
    "
  >
    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-4 text-center text-xs sm:flex-row sm:justify-between sm:text-left"
    >
      <p>© {{ year }} Fixtura — ADBDigital. Tous droits réservés.</p>

      <nav
        aria-label="Liens légaux"
        class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
      >
        <Link href="/mentions-legales" class="hover:text-sand-12 hover:underline">
          Mentions légales
        </Link>
        <Link href="/cgu" class="hover:text-sand-12 hover:underline">CGU</Link>
        <Link href="/confidentialite" class="hover:text-sand-12 hover:underline">
          Confidentialité
        </Link>
        <a
          v-if="isOwner"
          href="/compte/export"
          class="hover:text-sand-12 hover:underline"
          title="Télécharger toutes les données de votre club (JSON)"
        >
          Exporter mes données
        </a>
      </nav>
    </div>
  </footer>
</template>
