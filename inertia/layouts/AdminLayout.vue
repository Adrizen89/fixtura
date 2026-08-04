<script setup lang="ts">
import { computed } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import type { AuthUser, FlashMessages } from '~/app/types'

const page = usePage()
const user = computed(() => page.props.auth as AuthUser | null)
const flash = computed(() => page.props.flash as FlashMessages | undefined)

function logout() {
  router.post('/logout')
}
</script>

<template>
  <div class="min-h-screen bg-sand-2 text-sand-12">
    <header class="border-b border-sand-6 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/tournaments" class="flex items-center gap-2 font-bold text-sand-12">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">F</span>
          <span class="text-lg tracking-tight">Fixtura</span>
        </Link>

        <div v-if="user" class="flex items-center gap-3 text-sm">
          <span class="hidden text-sand-11 sm:inline">{{ user.email }}</span>
          <button
            type="button"
            class="rounded-md border border-sand-7 px-3 py-1.5 font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="logout"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>

    <!-- Bannières flash -->
    <div v-if="flash?.success || flash?.error" class="mx-auto max-w-6xl px-4 pt-4">
      <div
        v-if="flash?.success"
        class="rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800"
        role="status"
      >
        {{ flash.success }}
      </div>
      <div
        v-if="flash?.error"
        class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        {{ flash.error }}
      </div>
    </div>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
