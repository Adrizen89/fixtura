<script setup lang="ts">
import { computed } from 'vue'
import { Head, useForm, usePage } from '@inertiajs/vue3'
import SiteFooter from '~/components/SiteFooter.vue'
import type { FlashMessages, UserRole } from '~/app/types'

/**
 * Acceptation d'une invitation (issue #35) : l'invité choisit son nom + mot de
 * passe et rejoint le club avec le rôle prévu. L'email est fixé par l'invitation.
 */
const props = defineProps<{
  token: string
  email: string
  clubName: string
  role: UserRole
}>()

const page = usePage()
const flashError = computed(() => (page.props.flash as FlashMessages | undefined)?.error ?? null)

const roleLabel = computed(() => (props.role === 'owner' ? 'responsable' : 'organisateur'))

const form = useForm({
  fullName: '',
  password: '',
  passwordConfirmation: '',
})

function submit() {
  form.post(`/invitations/${props.token}`, {
    onFinish: () => form.reset('password', 'passwordConfirmation'),
  })
}
</script>

<template>
  <Head title="Rejoindre le club" />

  <div class="flex min-h-screen flex-col bg-sand-2">
    <div class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span
            class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-white"
          >
            F
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-sand-12">Rejoindre {{ clubName }}</h1>
          <p class="mt-1 text-sm text-sand-11">
            Vous avez été invité·e comme <strong>{{ roleLabel }}</strong> —
            <span class="text-sand-12">{{ email }}</span>
          </p>
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
            <label for="fullName" class="mb-1 block text-sm font-medium text-sand-12">
              Votre nom
            </label>
            <input
              id="fullName"
              v-model="form.fullName"
              type="text"
              autocomplete="name"
              required
              autofocus
              class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              :class="{ 'border-red-400': form.errors.fullName }"
            />
            <p v-if="form.errors.fullName" class="mt-1 text-sm text-red-700">
              {{ form.errors.fullName }}
            </p>
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-sand-12">
              Mot de passe
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
              Confirmer le mot de passe
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
            {{ form.processing ? 'Création…' : 'Rejoindre le club' }}
          </button>
        </form>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>
