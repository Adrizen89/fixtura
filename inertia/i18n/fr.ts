/**
 * Dictionnaire français (issue #123) — langue par défaut et fallback.
 *
 * Bundlé côté front et sélectionné par la locale partagée (useI18n). Clés imbriquées
 * par surface ; interpolation via {param}. Certaines valeurs légales contiennent du
 * HTML inline (rendu via v-html sur du contenu statique de confiance). Périmètre
 * traduit : écran public, inscription, pages légales, connexion/onboarding, layout.
 */
export default {
  locale: {
    switch: 'Choisir la langue',
  },
  common: {
    skipToContent: 'Aller au contenu',
    backHome: "Retour à l'accueil",
    goLogin: 'Aller à la connexion',
  },
  footer: {
    rights: '© {year} Fixtura — ADBDigital. Tous droits réservés.',
    legalLinks: 'Liens légaux',
    mentions: 'Mentions légales',
    cgu: 'CGU',
    privacy: 'Confidentialité',
    exportData: 'Exporter mes données',
    exportTitle: 'Télécharger toutes les données de votre club (JSON)',
  },
  legalLayout: {
    brand: 'Fixtura',
    backHome: "Retour à l'accueil",
    updatedAt: 'Dernière mise à jour : {date}',
  },
  nav: {
    brand: 'Fixtura',
    events: 'Événements',
    tournaments: 'Tournois',
    history: 'Historique',
    palmares: 'Palmarès',
    members: 'Membres',
    journal: 'Journal',
    appearance: 'Apparence',
    logout: 'Déconnexion',
    roleOwner: 'Responsable',
    roleOrganizer: 'Organisateur',
    currentClub: 'Club courant : {name}',
  },
  auth: {
    loginTitle: 'Connexion',
    organizersArea: 'Espace organisateurs',
    emailLabel: 'Adresse e-mail',
    passwordLabel: 'Mot de passe',
    signingIn: 'Connexion…',
    signIn: 'Se connecter',
    loginConsentBefore: 'En vous connectant, vous acceptez les',
    consentAnd: 'et la',
    privacyPolicy: 'politique de confidentialité',
    noClubYet: 'Pas encore de club ?',
    createClub: 'Créer un club',
    registerSubtitle: 'Vous serez le responsable du club.',
    clubNameLabel: 'Nom du club',
    fullNameLabel: 'Votre nom',
    passwordConfirmationLabel: 'Confirmer le mot de passe',
    creating: 'Création…',
    createClubButton: 'Créer le club',
    registerConsentBefore: 'En créant un club, vous acceptez les',
    alreadyAccount: 'Déjà un compte ?',
  },
  invitation: {
    headTitle: 'Rejoindre le club',
    joinClub: 'Rejoindre {club}',
    roleOwner: 'responsable',
    roleOrganizer: 'organisateur',
    invitedAs: 'Vous avez été invité·e comme',
    fullNameLabel: 'Votre nom',
    passwordLabel: 'Mot de passe',
    passwordConfirmLabel: 'Confirmer le mot de passe',
    submit: 'Rejoindre le club',
    submitting: 'Création…',
    invalidHeadTitle: 'Invitation invalide',
    unavailableTitle: 'Invitation indisponible',
    reasonAccepted: 'Cette invitation a déjà été acceptée. Connectez-vous avec votre compte.',
    reasonExpired:
      'Cette invitation a expiré. Demandez au responsable du club de vous en renvoyer une.',
    reasonNotFound: "Ce lien d'invitation est invalide ou n'existe plus.",
  },
  publicRegister: {
    headTitle: 'Inscription — {name}',
    organizedBy: 'Organisé par {club}',
    closedTitle: 'Les inscriptions ne sont pas ouvertes pour ce tournoi.',
    closedHint: "Revenez plus tard ou contactez l'organisateur.",
    fullTitle: 'Le tournoi est complet.',
    fullHint: "Toutes les places sont prises. Contactez l'organisateur en cas de désistement.",
    remaining: '{count} place(s) restante(s).',
    pendingNotice:
      "Votre demande sera validée par l'organisateur avant le tournoi. Vous serez informé(e) par e-mail de sa décision.",
    nameLabel: "Nom de l'équipe",
    emailLabel: 'E-mail de contact',
    submitting: 'Inscription…',
    submit: 'Inscrire mon équipe',
    rgpdBefore:
      "Le nom de l'équipe et l'e-mail de contact sont utilisés uniquement pour organiser ce tournoi et vous informer. Voir notre",
    rgpdLink: 'politique de confidentialité',
    invalidHeadTitle: "Lien d'inscription invalide",
    invalidTitle: 'Lien indisponible',
    invalidBody:
      "Ce lien d'inscription est invalide ou n'existe plus. Vérifiez l'adresse ou demandez un nouveau lien à l'organisateur.",
  },
  publicEvent: {
    headTitle: '{name} — en direct',
    autoUpdate: 'Mise à jour automatique',
    emptyCategories: "Aucune catégorie n'est encore publiée pour cet événement.",
    categoriesNav: "Catégories de l'événement",
    fullscreenLink: 'Vue plein écran de la catégorie →',
    finalBracket: 'Tableau final',
    poolStandings: 'Classements par poule',
    standings: 'Classement',
    bracketAbove: 'Le tableau final est affiché ci-dessus.',
    standingsPending: "Le classement s'affichera dès le premier score.",
    matches: 'Matchs',
    pitchShort: 'T{n}',
    vs: 'vs',
    forfeit: 'Forfait',
    schedulePending: "Le planning n'est pas encore publié.",
    footer: 'Fixtura · résultats en direct',
    status: {
      upcoming: 'À venir',
      live: 'En direct',
      finished: 'Terminé',
    },
  },
  publicTournament: {
    headTitle: '{name} — en direct',
    status: {
      upcoming: 'À venir',
      live: 'En direct',
      finished: 'Terminé',
    },
    autoUpdate: 'Mise à jour automatique',
    finalBracket: 'Tableau final',
    standingsTitle: 'Classement',
    poolStandingsTitle: 'Classements par poule',
    bracketAbove: 'Le tableau final est affiché ci-dessus.',
    standingsCaption:
      'Classement en direct : rang, équipe, matchs joués, gagnés, nuls, perdus, différence de buts et points.',
    col: {
      team: 'Équipe',
      played: 'J',
      won: 'G',
      drawn: 'N',
      lost: 'P',
      goalDifference: 'Diff',
      points: 'Pts',
    },
    colFull: {
      played: 'Joués',
      won: 'Gagnés',
      drawn: 'Nuls',
      lost: 'Perdus',
      goalDifference: 'Différence de buts',
      points: 'Points',
    },
    sr: {
      played: 'matchs joués',
      won: 'gagnés',
      drawn: 'nuls',
      lost: 'perdus',
      goalDifference: 'différence de buts',
      points: 'points',
    },
    standingsEmpty: "Le classement s'affichera dès le premier score.",
    matchesTitle: 'Matchs',
    pitchShort: 'T{n}',
    forfeit: 'Forfait',
    shootout: 'Tirs au but',
    scheduleEmpty: "Le planning n'est pas encore publié.",
    addToCalendar: 'Ajouter à mon agenda',
    calendarHelp:
      "Suivez le planning depuis votre téléphone. L'abonnement se met à jour automatiquement (décalages, scores).",
    subscribeCalendar: "S'abonner au calendrier",
    downloadIcs: 'Télécharger le .ics',
    footerTagline: 'Fixtura · résultats en direct',
    legalNav: 'Liens légaux',
    legalMentions: 'Mentions légales',
    cgu: 'CGU',
    privacy: 'Confidentialité',
  },
  tv: {
    status: {
      upcoming: 'À venir',
      live: 'En direct',
      finished: 'Terminé',
    },
    panel: {
      schedule: 'Planning',
      standings: 'Classement',
    },
    pitchShort: 'T{n}',
    scheduleEmpty: 'Planning à venir',
    group: 'Poule {label}',
    col: {
      team: 'Équipe',
      played: 'J',
      goalDifference: 'Diff',
      points: 'Pts',
    },
    standingsEmpty: 'Classement à venir',
  },
  standings: {
    caption:
      'Classement du tournoi : rang, équipe, matchs joués, gagnés, nuls, perdus, buts pour et contre, différence de buts et points.',
    col: {
      pos: '#',
      team: 'Équipe',
      played: 'J',
      playedTitle: 'Joués',
      playedSr: '— matchs joués',
      won: 'G',
      wonTitle: 'Gagnés',
      wonSr: '— gagnés',
      drawn: 'N',
      drawnTitle: 'Nuls',
      drawnSr: '— nuls',
      lost: 'P',
      lostTitle: 'Perdus',
      lostSr: '— perdus',
      goalsFor: 'BP',
      goalsForTitle: 'Buts pour',
      goalsForSr: '— buts pour',
      goalsAgainst: 'BC',
      goalsAgainstTitle: 'Buts contre',
      goalsAgainstSr: '— buts contre',
      goalDifference: 'Diff',
      goalDifferenceTitle: 'Différence de buts',
      goalDifferenceSr: '— différence de buts',
      points: 'Pts',
      pointsTitle: 'Points',
      pointsSr: '— points',
    },
  },
  poolStandings: {
    pool: 'Poule {label}',
  },
  teamFollow: {
    follow: 'Suivre mon équipe',
    choose: '— Choisir —',
    enableNotifications: 'Activer les notifications',
    notificationsEnabled: 'Notifications activées',
    yourNextMatch: 'Votre prochain match',
    pitch: 'Terrain {number}',
    versus: 'contre {opponent}',
    allFinished: 'Tous vos matchs sont terminés. Rendez-vous au classement !',
    noUpcoming: "Aucun match à venir pour l'instant.",
    alertsLabel: 'Notifications de votre équipe',
    dismissAlert: 'Masquer cette alerte',
  },
  bracket: {
    r64: '32es de finale',
    r32: '16es de finale',
    r16: '8es de finale',
    qf: 'Quarts',
    sf: 'Demi-finales',
    final: 'Finale',
    third: 'Petite finale',
    finalRanking: 'Classement final',
    shootout: 'Tirs au but',
    emptyKnockout: "Le tableau final s'affichera une fois le planning généré.",
    winnersFinal: 'Finale gagnants',
    winnersRound: 'Principal — T {n}',
    losersFinal: 'Finale repêchage',
    losersRound: 'Repêchage — T {n}',
    mainBracket: 'Tableau principal',
    losersBracket: 'Repêchage',
    grandFinal: 'Grande finale',
    emptyBracket: "Le tableau s'affichera une fois le planning généré.",
  },
  legal: {
    mentions: {
      title: 'Mentions légales',
      publisher: {
        heading: 'Éditeur',
        intro:
          'Le site <strong>Fixtura</strong> (accessible à l\'adresse <a href="https://fixtura.fr">fixtura.fr</a>) est édité par <strong>ADBDigital</strong>, micro-entreprise.',
        director: 'Responsable de la publication : Adrien (ADBDigital).',
        contact:
          'Contact : <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>',
        registration: 'SIREN / SIRET : <em>[à compléter]</em>',
        address: 'Adresse : <em>[à compléter]</em>',
      },
      hosting: {
        heading: 'Hébergement',
        intro:
          'Le site est hébergé sur un serveur privé virtuel (VPS) <strong>Hostinger</strong> :',
        company: 'Hostinger International Ltd.',
        location: '61 Lordou Vironos Str., 6023 Larnaca, Chypre.',
        website: 'Site : <a href="https://www.hostinger.fr">www.hostinger.fr</a>',
      },
      ip: {
        heading: 'Propriété intellectuelle',
        body: "L'ensemble des éléments constituant Fixtura (code, interface, identité visuelle, textes) est la propriété exclusive d'ADBDigital, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est interdite. La police de caractères <em>Inter</em> est utilisée sous licence SIL Open Font License et servie depuis nos propres serveurs.",
      },
      liability: {
        heading: 'Responsabilité',
        body: "Fixtura est un outil de gestion de tournois : les plannings, résultats et classements sont générés à partir des informations saisies par les organisateurs. ADBDigital ne saurait être tenue responsable des erreurs de saisie ni de l'indisponibilité temporaire du service.",
      },
      data: {
        heading: 'Données personnelles',
        body: 'Le traitement des données personnelles est décrit dans notre <a href="/confidentialite">politique de confidentialité</a>. Les conditions d\'utilisation figurent dans les <a href="/cgu">CGU</a>.',
      },
    },
    terms: {
      title: "Conditions générales d'utilisation",
      purpose: {
        heading: '1. Objet',
        body: "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'usage de <strong>Fixtura</strong>, outil de gestion de tournois de football édité par ADBDigital. En créant un compte ou en se connectant, l'organisateur accepte sans réserve les présentes CGU et la <a href=\"/confidentialite\">politique de confidentialité</a>.",
      },
      access: {
        heading: '2. Accès au service',
        body: "L'accès à l'espace d'administration est réservé aux organisateurs disposant d'un compte. À ce stade, les comptes et les clubs sont créés par ADBDigital ; il n'y a pas d'inscription publique en libre-service. Chaque organisateur est responsable de la confidentialité de ses identifiants et des actions réalisées avec son compte.",
      },
      usage: {
        heading: '3. Utilisation conforme',
        item1:
          "L'organisateur s'engage à n'enregistrer que les données nécessaires : des <strong>noms d'équipes</strong> — à l'exclusion de toute donnée personnelle de joueur (nom, âge, licence, etc.).",
        item2:
          "Il garantit être habilité à saisir et diffuser les informations qu'il publie (noms d'équipes, résultats).",
        item3: 'Toute utilisation détournée, frauduleuse ou contraire à la loi est interdite.',
      },
      publicDisplay: {
        heading: '4. Diffusion publique',
        body: "Chaque tournoi dispose d'un lien public en lecture seule affichant planning, résultats et classement. L'organisateur reconnaît que ces informations sont destinées à être partagées avec les équipes et le public présent.",
      },
      availability: {
        heading: '5. Disponibilité',
        body: "Fixtura est fourni « en l'état ». ADBDigital met en œuvre les moyens raisonnables pour assurer la disponibilité du service mais ne garantit pas une continuité sans interruption (maintenance, incident, hébergement).",
      },
      liability: {
        heading: '6. Responsabilité',
        body: "Les plannings, classements et résultats sont calculés à partir des données saisies par les organisateurs. ADBDigital ne saurait être tenue responsable des erreurs de saisie, ni des conséquences d'une utilisation non conforme du service.",
      },
      ip: {
        heading: '7. Propriété intellectuelle',
        body: 'Fixtura et ses composants sont la propriété d\'ADBDigital (voir les <a href="/mentions-legales">mentions légales</a>).',
      },
      changes: {
        heading: '8. Évolution des CGU',
        body: "ADBDigital peut faire évoluer les présentes CGU. La version applicable est celle en vigueur au moment de l'utilisation du service.",
      },
      law: {
        heading: '9. Droit applicable',
        body: 'Les présentes CGU sont soumises au droit français. À défaut de résolution amiable, les tribunaux français seront compétents.',
      },
    },
    privacy: {
      title: 'Politique de confidentialité',
      intro:
        'Cette politique décrit comment <strong>Fixtura</strong> (édité par ADBDigital) traite les données personnelles dans le cadre de la gestion de tournois de football. Nous appliquons le principe de <strong>minimisation</strong> : seules les données strictement nécessaires au service sont collectées.',
      controller: {
        heading: 'Responsable du traitement',
        body: 'ADBDigital — contact : <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>.',
      },
      data: {
        heading: 'Données collectées',
        organizers: {
          heading: 'Organisateurs (comptes)',
          item1: 'Nom (facultatif) et <strong>adresse e-mail</strong>.',
          item2: 'Mot de passe, jamais stocké en clair : il est <strong>haché</strong> (scrypt).',
          item3: 'Rôle (responsable ou organisateur) et club de rattachement.',
        },
        teams: {
          heading: 'Équipes et tournois',
          item1:
            "<strong>Nom des équipes uniquement</strong> — aucune donnée de joueur n'est gérée (ni nom, ni âge, ni licence).",
          item2:
            "Paramètres des tournois, planning, scores, statut des matchs et horodatage de la dernière saisie (avec l'organisateur l'ayant effectuée).",
        },
      },
      purpose: {
        heading: 'Finalités et base légale',
        body: "Les données servent exclusivement à fournir le service : authentifier les organisateurs, générer les plannings, saisir les résultats, calculer le classement en direct et le diffuser. La base légale est l'<strong>exécution du contrat</strong> qui vous lie à ADBDigital (fourniture de l'outil) et notre intérêt légitime à sécuriser l'accès.",
      },
      publicDisplay: {
        heading: 'Diffusion publique',
        body: "L'écran public d'un tournoi (accessible via un lien non devinable) est en <strong>lecture seule</strong> et n'affiche que des informations destinées à l'être : nom du tournoi, noms des équipes, scores et classement. Il n'expose <strong>jamais</strong> l'e-mail des organisateurs ni aucune donnée de compte.",
      },
      recipients: {
        heading: 'Destinataires et sous-traitants',
        item1: 'Les données ne sont ni vendues ni cédées à des tiers à des fins commerciales.',
        item2:
          'Hébergement : <strong>Hostinger</strong> (VPS, données stockées au sein de l\'Union européenne). Voir les <a href="/mentions-legales">mentions légales</a>.',
      },
      cookies: {
        heading: 'Cookies et traceurs',
        intro:
          "Fixtura n'utilise <strong>aucun traceur publicitaire ni outil de mesure d'audience</strong> (pas de Google Analytics, pas de pixel, etc.). Seuls sont déposés des cookies <strong>strictement nécessaires</strong> au fonctionnement :",
        item1: 'un cookie de session pour maintenir la connexion des organisateurs ;',
        item2: 'un cookie anti-CSRF pour sécuriser les formulaires.',
        note: "<strong>Aucune ressource tierce traçante</strong> n'est chargée : les polices de caractères sont hébergées sur nos propres serveurs (pas de Google Fonts ni de CDN externe). L'écran public, consulté sans compte, ne dépose aucun cookie.",
      },
      retention: {
        heading: 'Durée de conservation',
        body: "Les données d'un tournoi sont conservées tant que le club en a l'usage (historique des éditions). Un compte inactif ou un club peut être supprimé à tout moment sur demande (voir ci-dessous).",
      },
      rights: {
        heading: 'Vos droits',
        intro:
          "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition :",
        portability:
          "<strong>Portabilité / accès</strong> : le responsable d'un club peut télécharger l'intégralité des données du club au format JSON depuis son espace (lien « Exporter mes données » en pied de page).",
        erasure:
          '<strong>Effacement</strong> : sur demande à <a href="mailto:adri.veille.tech@gmail.com">adri.veille.tech@gmail.com</a>, un club et toutes ses données (tournois, équipes, matchs, comptes) sont supprimés définitivement.',
        complaint:
          'Vous pouvez également introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr">www.cnil.fr</a>).',
      },
      security: {
        heading: 'Sécurité',
        item1: 'Connexions chiffrées (HTTPS) et mots de passe hachés (scrypt).',
        item2: 'Accès public limité à la lecture seule, via un identifiant non devinable.',
      },
    },
  },
}
