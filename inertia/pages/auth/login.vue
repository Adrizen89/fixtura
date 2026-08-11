<script setup lang="ts">
import { computed } from 'vue'
import { Head, Link, useForm, usePage } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import { useI18n } from '~/composables/i18n'
import type { FlashMessages } from '~/app/types'

const { t } = useI18n()

const page = usePage()
const flashError = computed(() => (page.props.flash as FlashMessages | undefined)?.error ?? null)

const form = useForm({
  email: '',
  password: '',
})

function submit() {
  form.post('/login', {
    onFinish: () => form.reset('password'),
  })
}
</script>

<template>
  <Head :title="t('auth.loginTitle')" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <span
            class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-white"
          >
            F
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">Fixtura</h1>
          <p class="mt-1 text-sm text-sand-11">{{ t('auth.organizersArea') }}</p>
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
            <label for="email" class="mb-1 block text-sm font-medium text-sand-12">
              {{ t('auth.emailLabel') }}
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              autofocus
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
              autocomplete="current-password"
              required
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.password }"
            />
            <p v-if="form.errors.password" class="mt-1 text-sm text-red-700">
              {{ form.errors.password }}
            </p>
          </div>

          <button
            type="submit"
            :disabled="form.processing"
            class="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ form.processing ? t('auth.signingIn') : t('auth.signIn') }}
          </button>

          <p class="text-center text-xs leading-relaxed text-sand-10">
            {{ t('auth.loginConsentBefore') }}
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
          {{ t('auth.noClubYet') }}
          <Link href="/register" class="font-semibold text-primary hover:underline">
            {{ t('auth.createClub') }}
          </Link>
        </p>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
