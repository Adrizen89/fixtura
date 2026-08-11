<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import LegalLayout from '~/layouts/LegalLayout.vue'
import { useI18n } from '~/composables/i18n'

const { t } = useI18n()
</script>

<template>
  <Head :title="t('legal.mentions.title')" />

  <LegalLayout :title="t('legal.mentions.title')" updated-at="7 août 2026">
    <!-- eslint-disable vue/no-v-html -- contenu i18n statique et fiable (catalogue interne) -->
    <h2>{{ t('legal.mentions.publisher.heading') }}</h2>
    <p v-html="t('legal.mentions.publisher.intro')"></p>
    <ul>
      <li>{{ t('legal.mentions.publisher.director') }}</li>
      <li v-html="t('legal.mentions.publisher.contact')"></li>
      <li v-html="t('legal.mentions.publisher.registration')"></li>
      <li v-html="t('legal.mentions.publisher.address')"></li>
    </ul>

    <h2>{{ t('legal.mentions.hosting.heading') }}</h2>
    <p v-html="t('legal.mentions.hosting.intro')"></p>
    <ul>
      <li>{{ t('legal.mentions.hosting.company') }}</li>
      <li>{{ t('legal.mentions.hosting.location') }}</li>
      <li v-html="t('legal.mentions.hosting.website')"></li>
    </ul>

    <h2>{{ t('legal.mentions.ip.heading') }}</h2>
    <p v-html="t('legal.mentions.ip.body')"></p>

    <h2>{{ t('legal.mentions.liability.heading') }}</h2>
    <p>{{ t('legal.mentions.liability.body') }}</p>

    <h2>{{ t('legal.mentions.data.heading') }}</h2>
    <p v-html="t('legal.mentions.data.body')"></p>
  </LegalLayout>
</template>
