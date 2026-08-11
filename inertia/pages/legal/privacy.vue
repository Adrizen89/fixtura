<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import LegalLayout from '~/layouts/LegalLayout.vue'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()
</script>

<template>
  <Head :title="t('legal.privacy.title')" />

  <LegalLayout :title="t('legal.privacy.title')" updated-at="7 août 2026">
    <!-- eslint-disable vue/no-v-html -- contenu i18n statique et fiable (catalogue interne) -->
    <p v-html="t('legal.privacy.intro')"></p>

    <h2>{{ t('legal.privacy.controller.heading') }}</h2>
    <p v-html="t('legal.privacy.controller.body')"></p>

    <h2>{{ t('legal.privacy.data.heading') }}</h2>
    <h3>{{ t('legal.privacy.data.organizers.heading') }}</h3>
    <ul>
      <li v-html="t('legal.privacy.data.organizers.item1')"></li>
      <li v-html="t('legal.privacy.data.organizers.item2')"></li>
      <li>{{ t('legal.privacy.data.organizers.item3') }}</li>
    </ul>
    <h3>{{ t('legal.privacy.data.teams.heading') }}</h3>
    <ul>
      <li v-html="t('legal.privacy.data.teams.item1')"></li>
      <li>{{ t('legal.privacy.data.teams.item2') }}</li>
    </ul>

    <h2>{{ t('legal.privacy.purpose.heading') }}</h2>
    <p v-html="t('legal.privacy.purpose.body')"></p>

    <h2>{{ t('legal.privacy.publicDisplay.heading') }}</h2>
    <p v-html="t('legal.privacy.publicDisplay.body')"></p>

    <h2>{{ t('legal.privacy.recipients.heading') }}</h2>
    <ul>
      <li>{{ t('legal.privacy.recipients.item1') }}</li>
      <li v-html="t('legal.privacy.recipients.item2')"></li>
    </ul>

    <h2>{{ t('legal.privacy.cookies.heading') }}</h2>
    <p v-html="t('legal.privacy.cookies.intro')"></p>
    <ul>
      <li>{{ t('legal.privacy.cookies.item1') }}</li>
      <li>{{ t('legal.privacy.cookies.item2') }}</li>
    </ul>
    <p v-html="t('legal.privacy.cookies.note')"></p>

    <h2>{{ t('legal.privacy.retention.heading') }}</h2>
    <p>{{ t('legal.privacy.retention.body') }}</p>

    <h2>{{ t('legal.privacy.rights.heading') }}</h2>
    <p>{{ t('legal.privacy.rights.intro') }}</p>
    <ul>
      <li v-html="t('legal.privacy.rights.portability')"></li>
      <li v-html="t('legal.privacy.rights.erasure')"></li>
    </ul>
    <p v-html="t('legal.privacy.rights.complaint')"></p>

    <h2>{{ t('legal.privacy.security.heading') }}</h2>
    <ul>
      <li>{{ t('legal.privacy.security.item1') }}</li>
      <li>{{ t('legal.privacy.security.item2') }}</li>
    </ul>
  </LegalLayout>
</template>
