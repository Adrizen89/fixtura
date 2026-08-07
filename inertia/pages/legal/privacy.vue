<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import LegalLayout from '~/layouts/LegalLayout.vue'
</script>

<template>
  <Head title="Politique de confidentialité" />

  <LegalLayout title="Politique de confidentialité" updated-at="7 août 2026">
    <p>
      Cette politique décrit comment <strong>Fixtura</strong> (édité par ADBDigital) traite les
      données personnelles dans le cadre de la gestion de tournois de football. Nous appliquons le
      principe de <strong>minimisation</strong> : seules les données strictement nécessaires au
      service sont collectées.
    </p>

    <h2>Responsable du traitement</h2>
    <p>
      ADBDigital — contact :
      <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>.
    </p>

    <h2>Données collectées</h2>
    <h3>Organisateurs (comptes)</h3>
    <ul>
      <li>Nom (facultatif) et <strong>adresse e-mail</strong>.</li>
      <li>Mot de passe, jamais stocké en clair : il est <strong>haché</strong> (scrypt).</li>
      <li>Rôle (responsable ou organisateur) et club de rattachement.</li>
    </ul>
    <h3>Équipes et tournois</h3>
    <ul>
      <li>
        <strong>Nom des équipes uniquement</strong> — aucune donnée de joueur n'est gérée (ni nom,
        ni âge, ni licence).
      </li>
      <li>
        Paramètres des tournois, planning, scores, statut des matchs et horodatage de la dernière
        saisie (avec l'organisateur l'ayant effectuée).
      </li>
    </ul>

    <h2>Finalités et base légale</h2>
    <p>
      Les données servent exclusivement à fournir le service : authentifier les organisateurs,
      générer les plannings, saisir les résultats, calculer le classement en direct et le diffuser.
      La base légale est l'<strong>exécution du contrat</strong> qui vous lie à ADBDigital
      (fourniture de l'outil) et notre intérêt légitime à sécuriser l'accès.
    </p>

    <h2>Diffusion publique</h2>
    <p>
      L'écran public d'un tournoi (accessible via un lien non devinable) est en
      <strong>lecture seule</strong> et n'affiche que des informations destinées à l'être : nom du
      tournoi, noms des équipes, scores et classement. Il n'expose <strong>jamais</strong> l'e-mail
      des organisateurs ni aucune donnée de compte.
    </p>

    <h2>Destinataires et sous-traitants</h2>
    <ul>
      <li>Les données ne sont ni vendues ni cédées à des tiers à des fins commerciales.</li>
      <li>
        Hébergement : <strong>Hostinger</strong> (VPS, données stockées au sein de l'Union
        européenne). Voir les <a href="/mentions-legales">mentions légales</a>.
      </li>
    </ul>

    <h2>Cookies et traceurs</h2>
    <p>
      Fixtura n'utilise
      <strong>aucun traceur publicitaire ni outil de mesure d'audience</strong> (pas de Google
      Analytics, pas de pixel, etc.). Seuls sont déposés des cookies
      <strong>strictement nécessaires</strong> au fonctionnement :
    </p>
    <ul>
      <li>un cookie de session pour maintenir la connexion des organisateurs ;</li>
      <li>un cookie anti-CSRF pour sécuriser les formulaires.</li>
    </ul>
    <p>
      <strong>Aucune ressource tierce traçante</strong> n'est chargée : les polices de caractères
      sont hébergées sur nos propres serveurs (pas de Google Fonts ni de CDN externe). L'écran
      public, consulté sans compte, ne dépose aucun cookie.
    </p>

    <h2>Durée de conservation</h2>
    <p>
      Les données d'un tournoi sont conservées tant que le club en a l'usage (historique des
      éditions). Un compte inactif ou un club peut être supprimé à tout moment sur demande (voir
      ci-dessous).
    </p>

    <h2>Vos droits</h2>
    <p>
      Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de
      portabilité et d'opposition :
    </p>
    <ul>
      <li>
        <strong>Portabilité / accès</strong> : le responsable d'un club peut télécharger
        l'intégralité des données du club au format JSON depuis son espace (lien « Exporter mes
        données » en pied de page).
      </li>
      <li>
        <strong>Effacement</strong> : sur demande à
        <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>, un club et
        toutes ses données (tournois, équipes, matchs, comptes) sont supprimés définitivement.
      </li>
    </ul>
    <p>
      Vous pouvez également introduire une réclamation auprès de la CNIL (<a
        href="https://www.cnil.fr"
        >www.cnil.fr</a
      >).
    </p>

    <h2>Sécurité</h2>
    <ul>
      <li>Connexions chiffrées (HTTPS) et mots de passe hachés (scrypt).</li>
      <li>Accès public limité à la lecture seule, via un identifiant non devinable.</li>
    </ul>
  </LegalLayout>
</template>
