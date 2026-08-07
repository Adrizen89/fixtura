<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import LegalLayout from '~/layouts/LegalLayout.vue'
</script>

<template>
  <Head title="Mentions légales" />

  <LegalLayout title="Mentions légales" updated-at="7 août 2026">
    <h2>Éditeur</h2>
    <p>
      Le site <strong>Fixtura</strong> (accessible à l'adresse
      <a href="https://fixtura.fr">fixtura.fr</a>) est édité par <strong>ADBDigital</strong>,
      micro-entreprise.
    </p>
    <ul>
      <li>Responsable de la publication : Adrien (ADBDigital).</li>
      <li>
        Contact :
        <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>
      </li>
      <li>SIREN / SIRET : <em>[à compléter]</em></li>
      <li>Adresse : <em>[à compléter]</em></li>
    </ul>

    <h2>Hébergement</h2>
    <p>
      Le site est hébergé sur un serveur privé virtuel (VPS)
      <strong>Hostinger</strong> :
    </p>
    <ul>
      <li>Hostinger International Ltd.</li>
      <li>61 Lordou Vironos Str., 6023 Larnaca, Chypre.</li>
      <li>Site : <a href="https://www.hostinger.fr">www.hostinger.fr</a></li>
    </ul>

    <h2>Propriété intellectuelle</h2>
    <p>
      L'ensemble des éléments constituant Fixtura (code, interface, identité visuelle, textes) est
      la propriété exclusive d'ADBDigital, sauf mention contraire. Toute reproduction ou
      représentation, totale ou partielle, sans autorisation préalable est interdite. La police de
      caractères <em>Inter</em> est utilisée sous licence SIL Open Font License et servie depuis nos
      propres serveurs.
    </p>

    <h2>Responsabilité</h2>
    <p>
      Fixtura est un outil de gestion de tournois : les plannings, résultats et classements sont
      générés à partir des informations saisies par les organisateurs. ADBDigital ne saurait être
      tenue responsable des erreurs de saisie ni de l'indisponibilité temporaire du service.
    </p>

    <h2>Données personnelles</h2>
    <p>
      Le traitement des données personnelles est décrit dans notre
      <a href="/confidentialite">politique de confidentialité</a>. Les conditions d'utilisation
      figurent dans les <a href="/cgu">CGU</a>.
    </p>
  </LegalLayout>
</template>
