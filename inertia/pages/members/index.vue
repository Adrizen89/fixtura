<script setup lang="ts">
import { ref } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import AdminLayout from '~/layouts/AdminLayout.vue'
import { useI18n } from '~/composables/i18n'
import type { UserRole } from '~/app/types'

const { t } = useI18n()

/**
 * Gestion des membres du club (issue #35) — réservé au responsable (`owner`).
 * Inviter (lien + jeton), révoquer, changer un rôle, retirer un membre.
 */
interface Member {
  id: number
  fullName: string | null
  email: string
  role: UserRole
  isSelf: boolean
}
interface PendingInvitation {
  id: number
  email: string
  role: UserRole
  expiresAt: string | null
  acceptUrl: string
}

defineProps<{ members: Member[]; invitations: PendingInvitation[] }>()

const inviteForm = useForm({ email: '', role: 'organizer' as UserRole })

function invite() {
  inviteForm.post('/membres/invitations', {
    preserveScroll: true,
    onSuccess: () => inviteForm.reset('email'),
  })
}

function changeRole(member: Member, role: UserRole) {
  if (role === member.role) return
  router.patch(`/membres/${member.id}/role`, { role }, { preserveScroll: true })
}

function removeMember(member: Member) {
  if (confirm(t('membersAdmin.confirmRemove', { email: member.email }))) {
    router.delete(`/membres/${member.id}`, { preserveScroll: true })
  }
}

function revokeInvitation(invitation: PendingInvitation) {
  if (confirm(t('membersAdmin.confirmRevoke', { email: invitation.email }))) {
    router.delete(`/membres/invitations/${invitation.id}`, { preserveScroll: true })
  }
}

const copiedId = ref<number | null>(null)
async function copyLink(invitation: PendingInvitation) {
  try {
    await navigator.clipboard.writeText(invitation.acceptUrl)
    copiedId.value = invitation.id
    setTimeout(() => (copiedId.value = null), 2000)
  } catch {
    // Presse-papiers indisponible : l'utilisateur peut copier depuis le champ.
  }
}

function roleLabel(role: UserRole) {
  return role === 'owner' ? t('membersAdmin.roleOwner') : t('membersAdmin.roleOrganizer')
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <Head :title="t('nav.members')" />

  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-sand-12">{{ t('membersAdmin.title') }}</h1>
      <p class="mt-1 text-sm text-sand-11">
        {{ t('membersAdmin.subtitle') }}
      </p>
    </div>

    <!-- Inviter un organisateur -->
    <section class="mb-8 rounded-2xl border border-sand-6 bg-white p-5">
      <h2 class="mb-3 text-lg font-semibold text-sand-12">{{ t('membersAdmin.inviteHeading') }}</h2>
      <form class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit.prevent="invite">
        <div class="flex-1">
          <label for="invite-email" class="sr-only">{{ t('membersAdmin.emailLabel') }}</label>
          <input
            id="invite-email"
            v-model="inviteForm.email"
            type="email"
            required
            :placeholder="t('membersAdmin.emailPlaceholder')"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            :class="{ 'border-red-400': inviteForm.errors.email }"
          />
          <p v-if="inviteForm.errors.email" class="mt-1 text-sm text-red-700">
            {{ inviteForm.errors.email }}
          </p>
        </div>
        <div>
          <label for="invite-role" class="sr-only">{{ t('membersAdmin.roleLabel') }}</label>
          <select
            id="invite-role"
            v-model="inviteForm.role"
            class="w-full rounded-lg border border-sand-7 px-3 py-2 text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-44"
          >
            <option value="organizer">{{ t('membersAdmin.roleOrganizer') }}</option>
            <option value="owner">{{ t('membersAdmin.roleOwner') }}</option>
          </select>
        </div>
        <button
          type="submit"
          :disabled="inviteForm.processing"
          class="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ t('membersAdmin.inviteButton') }}
        </button>
      </form>
    </section>

    <!-- Invitations en attente -->
    <section v-if="invitations.length" class="mb-8">
      <h2 class="mb-3 text-lg font-semibold text-sand-12">
        {{ t('membersAdmin.pendingHeading') }}
      </h2>
      <ul class="space-y-3">
        <li
          v-for="inv in invitations"
          :key="inv.id"
          class="rounded-xl border border-sand-6 bg-white p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium text-sand-12">{{ inv.email }}</p>
              <p class="text-sm text-sand-10">
                {{
                  t('membersAdmin.invitationMeta', {
                    role: roleLabel(inv.role),
                    date: formatDate(inv.expiresAt),
                  })
                }}
              </p>
            </div>
            <button
              type="button"
              class="text-sm font-medium text-red-700 hover:underline"
              @click="revokeInvitation(inv)"
            >
              {{ t('membersAdmin.revoke') }}
            </button>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <input
              :value="inv.acceptUrl"
              readonly
              :aria-label="t('membersAdmin.invitationLinkLabel')"
              class="w-full rounded-lg border border-sand-6 bg-sand-2 px-3 py-1.5 text-xs text-sand-11 outline-none"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg border border-sand-7 px-3 py-1.5 text-sm font-medium text-sand-11 transition hover:bg-sand-3 hover:text-sand-12"
              @click="copyLink(inv)"
            >
              {{ copiedId === inv.id ? t('membersAdmin.copied') : t('membersAdmin.copyLink') }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Membres -->
    <section>
      <h2 class="mb-3 text-lg font-semibold text-sand-12">
        {{ t('membersAdmin.membersHeading', { count: members.length }) }}
      </h2>
      <ul class="divide-y divide-sand-5 rounded-2xl border border-sand-6 bg-white">
        <li
          v-for="member in members"
          :key="member.id"
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-sand-12">
              {{ member.fullName || member.email }}
              <span v-if="member.isSelf" class="text-xs font-normal text-sand-9">{{
                t('membersAdmin.you')
              }}</span>
            </p>
            <p class="truncate text-sm text-sand-10">{{ member.email }}</p>
          </div>
          <div class="flex items-center gap-3">
            <label :for="`role-${member.id}`" class="sr-only">{{
              t('membersAdmin.roleForLabel', { email: member.email })
            }}</label>
            <select
              :id="`role-${member.id}`"
              :value="member.role"
              class="rounded-lg border border-sand-7 px-2.5 py-1.5 text-sm text-sand-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              @change="changeRole(member, ($event.target as HTMLSelectElement).value as UserRole)"
            >
              <option value="organizer">{{ t('membersAdmin.roleOrganizer') }}</option>
              <option value="owner">{{ t('membersAdmin.roleOwner') }}</option>
            </select>
            <button
              v-if="!member.isSelf"
              type="button"
              class="text-sm font-medium text-red-700 hover:underline"
              @click="removeMember(member)"
            >
              {{ t('membersAdmin.remove') }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </AdminLayout>
</template>
