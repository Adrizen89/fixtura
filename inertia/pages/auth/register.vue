<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link, useForm, usePage } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import { useI18n } from '~/composables/i18n'
import type { FlashMessages } from '~/app/types'

/**
 * Inscription d'un club (issue #35) : crée le club et son premier responsable
 * (`owner`). Formulaire public, même gabarit que la connexion.
 */
const { t } = useI18n()

const page = usePage()
const flashError = computed(() => (page.props.flash as FlashMessages | undefined)?.error ?? null)

const form = useForm({
  clubName: '',
  fullName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
})

function submit() {
  form.post('/register', {
    onFinish: () => form.reset('password', 'passwordConfirmation'),
  })
}
</script>

<template>
  <Head :title="t('auth.createClub')" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span
            class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-white"
          >
            F
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ t('auth.createClub') }}</h1>
          <p class="mt-1 text-sm text-sand-11">{{ t('auth.registerSubtitle') }}</p>
        </div>

        <form
          class="space-y-4 rounded-2xl border border-sand-6 bg-white p-6 shadow-sm"
          @submit.prevent="submit"
        >
          <div
            v-if="flashError"
            class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {{ flashError }}
          </div>

          <div>
            <label for="clubName" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.clubNameLabel') }}
            </label>
            <input
              id="clubName"
              v-model="form.clubName"
              type="text"
              required
              autofocus
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.clubName }"
            />
            <p v-if="form.errors.clubName" class="mt-1 text-sm text-red-700">
              {{ form.errors.clubName }}
            </p>
          </div>

          <div>
            <label for="fullName" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.fullNameLabel') }}
            </label>
            <input
              id="fullName"
              v-model="form.fullName"
              type="text"
              autocomplete="name"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.fullName }"
            />
            <p v-if="form.errors.fullName" class="mt-1 text-sm text-red-700">
              {{ form.errors.fullName }}
            </p>
          </div>

          <div>
            <label for="email" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.emailLabel') }}
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.email }"
            />
            <p v-if="form.errors.email" class="mt-1 text-sm text-red-700">
              {{ form.errors.email }}
            </p>
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.passwordLabel') }}
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.password }"
            />
            <p v-if="form.errors.password" class="mt-1 text-sm text-red-700">
              {{ form.errors.password }}
            </p>
          </div>

          <div>
            <label for="passwordConfirmation" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.passwordConfirmationLabel') }}
            </label>
            <input
              id="passwordConfirmation"
              v-model="form.passwordConfirmation"
              type="password"
              autocomplete="new-password"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.passwordConfirmation }"
            />
            <p v-if="form.errors.passwordConfirmation" class="mt-1 text-sm text-red-700">
              {{ form.errors.passwordConfirmation }}
            </p>
          </div>

          <button
            type="submit"
            :disabled="form.processing"
            class="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ form.processing ? t('auth.creating') : t('auth.createClubButton') }}
          </button>

          <p class="text-center text-xs leading-relaxed text-sand-10">
            {{ t('auth.registerConsentBefore') }}
            <Link href="/cgu" class="font-medium text-primary hover:underline">{{
              t('footer.cgu')
            }}</Link>
            {{ t('auth.consentAnd') }}
            <Link href="/confidentialite" class="font-medium text-primary hover:underline">
              {{ t('auth.privacyPolicy') }} </Link
            >.
          </p>
        </form>

        <p class="mt-6 text-center text-sm text-sand-11">
          {{ t('auth.alreadyAccount') }}
          <Link href="/login" class="font-semibold text-primary hover:underline">
            {{ t('auth.signIn') }}
          </Link>
        </p>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
