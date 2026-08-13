<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from '~/composables/i18n'

/**
 * Bascule de thème clair / sombre (refonte visuelle — fondations).
 *
 * Trois états cyclés : **système** (aucune préférence → suit `prefers-color-scheme`)
 * → **clair** → **sombre**. Le choix est appliqué immédiatement côté client
 * (`data-theme` sur `<html>`) et persisté dans un cookie `theme` lisible en JS ;
 * au prochain chargement, un court script inline (dans `inertia_layout.edge`)
 * repose l'attribut **avant le premier rendu**, ce qui évite tout flash.
 *
 * SSR-safe : aucun accès au DOM hors `onMounted`.
 */
type Theme = 'system' | 'light' | 'dark'

const { t } = useI18n()

const current = ref<Theme>('system')

const order: Theme[] = ['system', 'light', 'dark']

/** Prochain état du cycle (pour l'action et son libellé accessible). */
const next = computed<Theme>(() => order[(order.indexOf(current.value) + 1) % order.length])

const nextLabel = computed(() => {
  if (next.value === 'light') return t('theme.toGoLight')
  if (next.value === 'dark') return t('theme.toGoDark')
  return t('theme.toGoSystem')
})

const currentLabel = computed(() => t(`theme.${current.value}`))

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
    // Efface le cookie de préférence → retour à la préférence système.
    document.cookie = 'theme=; path=/; max-age=0; samesite=lax'
  } else {
    root.setAttribute('data-theme', theme)
    document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`
  }
  current.value = theme
}

function cycle() {
  apply(next.value)
}

onMounted(() => {
  const attr = document.documentElement.getAttribute('data-theme')
  current.value = attr === 'light' || attr === 'dark' ? attr : 'system'
})
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border border-sand-7 px-2.5 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    :aria-label="nextLabel"
    :title="nextLabel"
    @click="cycle"
  >
    <!-- Système : demi-cercle -->
    <svg
      v-if="current === 'system'"
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
      <path d="M12 3a9 9 0 000 18z" fill="currentColor" />
    </svg>
    <!-- Clair : soleil -->
    <svg
      v-else-if="current === 'light'"
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      />
    </svg>
    <!-- Sombre : lune -->
    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
    <span class="hidden sm:inline">{{ currentLabel }}</span>
  </button>
</template>
