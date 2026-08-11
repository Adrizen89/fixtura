<script setup lang="ts">
import { useI18n } from '~/composables/i18n'

/**
 * Sélecteur de langue (issue #123). Liens plein-page vers `/locale/:locale` : le
 * serveur pose le cookie de préférence puis renvoie sur la page d'origine. Volontairement
 * de simples `<a>` (rechargement complet) — robuste et sans dépendance à Inertia.
 */
const { t, locale } = useI18n()

const locales = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]
</script>

<template>
  <nav :aria-label="t('locale.switch')" class="inline-flex items-center gap-1 text-xs font-medium">
    <template v-for="(l, i) in locales" :key="l.code">
      <span v-if="i > 0" class="text-sand-8" aria-hidden="true">·</span>
      <a
        :href="`/locale/${l.code}`"
        :aria-current="locale === l.code ? 'true' : undefined"
        :class="
          locale === l.code
            ? 'rounded px-1.5 py-0.5 font-semibold text-sand-12'
            : 'rounded px-1.5 py-0.5 text-sand-10 hover:text-sand-12'
        "
      >
        {{ l.label }}
      </a>
    </template>
  </nav>
</template>
