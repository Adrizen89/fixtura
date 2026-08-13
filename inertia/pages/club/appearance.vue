<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { Head, Link, useForm } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()

/**
 * Personnalisation du club (issue #40) : logo + couleur d'accent affichés sur
 * l'écran public. Le logo est lu **côté client** en data-URI (aucun upload de
 * fichier sur le serveur), avec garde-fou de taille et de type.
 */
const props = defineProps<{
  club: { name: string; logo: string | null; primaryColor: string | null }
}>()

const DEFAULT_COLOR = '#16a34a'
const MAX_LOGO_KB = 200

const form = useForm({
  logo: props.club.logo ?? '',
  primaryColor: props.club.primaryColor ?? '',
})

const useColor = ref(Boolean(props.club.primaryColor))
const colorHex = ref(props.club.primaryColor || DEFAULT_COLOR)
const logoError = ref('')

// La couleur envoyée suit la case « couleur personnalisée » (vide = défaut).
watchEffect(() => {
  form.primaryColor = useColor.value ? colorHex.value : ''
})

const previewColor = computed(() => (useColor.value ? colorHex.value : DEFAULT_COLOR))

function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
    logoError.value = t('clubAdmin.errorFormat')
    return
  }
  if (file.size > MAX_LOGO_KB * 1024) {
    logoError.value = t('clubAdmin.errorTooLarge', { max: MAX_LOGO_KB })
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.logo = String(reader.result)
    logoError.value = ''
  }
  reader.onerror = () => {
    logoError.value = t('clubAdmin.errorRead')
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  form.logo = ''
  logoError.value = ''
}

function submit() {
  form.post('/club/apparence', { preserveScroll: true })
}
</script>

<template>
  <Head :title="t('clubAdmin.appearanceTitle')" />

  <AdminLayout>
    <div class="mb-6">
      <Link href="/tournaments" class="text-sm text-sand-11 hover:text-sand-12"
        >← {{ t('clubAdmin.backToTournaments') }}</Link
      >
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-sand-12">
        {{ t('clubAdmin.appearanceTitle') }}
      </h1>
      <p class="mt-1 text-sand-11">{{ t('clubAdmin.appearanceIntro') }}</p>
    </div>

    <form class="grid grid-cols-1 gap-6 lg:grid-cols-3" @submit.prevent="submit">
      <!-- Réglages -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Logo -->
        <section class="rounded-2xl border border-sand-6 bg-surface p-6">
          <h2 class="mb-1 text-base font-semibold text-sand-12">
            {{ t('clubAdmin.logoHeading') }}
          </h2>
          <p class="mb-4 text-sm text-sand-11">
            {{ t('clubAdmin.logoHint', { max: MAX_LOGO_KB }) }}
          </p>

          <div class="flex flex-wrap items-center gap-4">
            <div
              class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-sand-6 bg-sand-2"
            >
              <img
                v-if="form.logo"
                :src="form.logo"
                :alt="t('clubAdmin.logoPreviewAlt')"
                class="max-h-full max-w-full object-contain"
              />
              <span v-else class="text-xs text-sand-9">{{ t('clubAdmin.none') }}</span>
            </div>
            <div class="flex flex-col gap-2">
              <label
                class="inline-flex w-fit cursor-pointer rounded-lg border border-sand-7 px-4 py-2 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
              >
                {{ t('clubAdmin.chooseFile') }}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  class="sr-only"
                  @change="onLogoChange"
                />
              </label>
              <button
                v-if="form.logo"
                type="button"
                class="w-fit text-sm font-medium text-red-700 hover:underline"
                @click="removeLogo"
              >
                {{ t('clubAdmin.removeLogo') }}
              </button>
            </div>
          </div>
          <p v-if="logoError" class="mt-3 text-sm text-red-700" role="alert">{{ logoError }}</p>
          <p v-if="form.errors.logo" class="mt-3 text-sm text-red-700" role="alert">
            {{ form.errors.logo }}
          </p>
        </section>

        <!-- Couleur -->
        <section class="rounded-2xl border border-sand-6 bg-surface p-6">
          <h2 class="mb-1 text-base font-semibold text-sand-12">
            {{ t('clubAdmin.colorHeading') }}
          </h2>
          <p class="mb-4 text-sm text-sand-11">{{ t('clubAdmin.colorHint') }}</p>

          <label class="flex items-center gap-2 text-sm font-medium text-sand-12">
            <input v-model="useColor" type="checkbox" class="h-4 w-4 rounded border-sand-7" />
            {{ t('clubAdmin.useCustomColor') }}
          </label>

          <div v-if="useColor" class="mt-4 flex items-center gap-3">
            <input
              v-model="colorHex"
              type="color"
              :aria-label="t('clubAdmin.colorPickerLabel')"
              class="h-10 w-14 cursor-pointer rounded border border-sand-7 bg-surface p-1"
            />
            <input
              v-model="colorHex"
              type="text"
              spellcheck="false"
              :aria-label="t('clubAdmin.hexCodeLabel')"
              class="w-32 rounded-lg border border-sand-7 px-3 py-2 font-mono text-sm text-sand-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <p v-if="form.errors.primaryColor" class="mt-3 text-sm text-red-700" role="alert">
            {{ form.errors.primaryColor }}
          </p>
        </section>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="form.processing"
            class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {{ t('clubAdmin.save') }}
          </button>
        </div>
      </div>

      <!-- Aperçu -->
      <aside class="lg:col-span-1">
        <div class="lg:sticky lg:top-6">
          <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-sand-9">
            {{ t('clubAdmin.previewHeading') }}
          </h2>
          <div class="overflow-hidden rounded-2xl border border-sand-6 bg-surface">
            <div class="h-2" :style="{ backgroundColor: previewColor }" />
            <div class="flex items-center gap-3 p-5">
              <img
                v-if="form.logo"
                :src="form.logo"
                alt=""
                class="h-12 w-12 shrink-0 rounded-lg object-contain"
              />
              <span
                v-else
                class="grid h-12 w-12 shrink-0 place-items-center rounded-lg font-bold text-white"
                :style="{ backgroundColor: previewColor }"
              >
                {{ club.name.charAt(0).toUpperCase() }}
              </span>
              <div>
                <div class="text-lg font-extrabold text-sand-12">{{ club.name }}</div>
                <div class="text-sm text-sand-11">{{ t('clubAdmin.publicScreen') }}</div>
              </div>
            </div>
            <div class="px-5 pb-5">
              <span
                class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide text-white"
                :style="{ backgroundColor: previewColor }"
              >
                {{ t('clubAdmin.live') }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </form>
  </AdminLayout>
</template>
