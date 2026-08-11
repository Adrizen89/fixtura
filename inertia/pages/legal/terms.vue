<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import LegalLayout from '~/layouts/LegalLayout.vue'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()
</script>

<template>
  <Head :title="t('legal.terms.title')" />

  <LegalLayout :title="t('legal.terms.title')" updated-at="7 août 2026">
    <!-- eslint-disable vue/no-v-html -- contenu i18n statique et fiable (catalogue interne) -->
    <h2>{{ t('legal.terms.purpose.heading') }}</h2>
    <p v-html="t('legal.terms.purpose.body')"></p>

    <h2>{{ t('legal.terms.access.heading') }}</h2>
    <p>{{ t('legal.terms.access.body') }}</p>

    <h2>{{ t('legal.terms.usage.heading') }}</h2>
    <ul>
      <li v-html="t('legal.terms.usage.item1')"></li>
      <li>{{ t('legal.terms.usage.item2') }}</li>
      <li>{{ t('legal.terms.usage.item3') }}</li>
    </ul>

    <h2>{{ t('legal.terms.publicDisplay.heading') }}</h2>
    <p>{{ t('legal.terms.publicDisplay.body') }}</p>

    <h2>{{ t('legal.terms.availability.heading') }}</h2>
    <p>{{ t('legal.terms.availability.body') }}</p>

    <h2>{{ t('legal.terms.liability.heading') }}</h2>
    <p>{{ t('legal.terms.liability.body') }}</p>

    <h2>{{ t('legal.terms.ip.heading') }}</h2>
    <p v-html="t('legal.terms.ip.body')"></p>

    <h2>{{ t('legal.terms.changes.heading') }}</h2>
    <p>{{ t('legal.terms.changes.body') }}</p>

    <h2>{{ t('legal.terms.law.heading') }}</h2>
    <p>{{ t('legal.terms.law.body') }}</p>
  </LegalLayout>
</template>
