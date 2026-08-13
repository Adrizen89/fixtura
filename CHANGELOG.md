# Changelog

## [0.1.7](https://github.com/Adrizen89/fixtura/compare/v0.1.6...v0.1.7) (2026-08-13)


### ✨ Fonctionnalités

* add configurable scoring system per tournament ([#104](https://github.com/Adrizen89/fixtura/issues/104)) ([cb8fd74](https://github.com/Adrizen89/fixtura/commit/cb8fd74f2967911cd3bb6ddcbd65ad73162a59c8))
* API de lecture publique JSON (planning, résultats, classement) ([#122](https://github.com/Adrizen89/fixtura/issues/122)) ([#138](https://github.com/Adrizen89/fixtura/issues/138)) ([2408683](https://github.com/Adrizen89/fixtura/commit/24086836715c9661e89a309eebff4a93fd3f570a))
* classement final (podium 1er–4e) du tableau à élimination ([#128](https://github.com/Adrizen89/fixtura/issues/128)) ([c7467fd](https://github.com/Adrizen89/fixtura/commit/c7467fd98e032cf61627562184c579e4936a5220)), closes [#106](https://github.com/Adrizen89/fixtura/issues/106)
* export iCal / abonnement calendrier du planning ([#121](https://github.com/Adrizen89/fixtura/issues/121)) ([ad507b0](https://github.com/Adrizen89/fixtura/commit/ad507b04a85c1a753c2ceca9163b5cb6de8115c6))
* format système suisse — moteur pur + intégration ([#110](https://github.com/Adrizen89/fixtura/issues/110)) ([2a497f2](https://github.com/Adrizen89/fixtura/commit/2a497f23b8957903876025e436446fc6b9f1346c))
* historique & consultation des éditions terminées ([#108](https://github.com/Adrizen89/fixtura/issues/108)) ([#124](https://github.com/Adrizen89/fixtura/issues/124)) ([8fb0d69](https://github.com/Adrizen89/fixtura/commit/8fb0d69ca65771d51edd34b0186c964ed7b177fa))
* implement double elimination bracket format ([#111](https://github.com/Adrizen89/fixtura/issues/111)) ([#133](https://github.com/Adrizen89/fixtura/issues/133)) ([cbe79a1](https://github.com/Adrizen89/fixtura/commit/cbe79a15b3eba40f00cf2e977749e45f5e2e396a))
* import d'équipes depuis un fichier CSV / Excel ([#120](https://github.com/Adrizen89/fixtura/issues/120)) ([bbfb737](https://github.com/Adrizen89/fixtura/commit/bbfb7370772b0408693c570f5b6c35e24a0d6a7c))
* journal d'audit des actions sensibles ([#117](https://github.com/Adrizen89/fixtura/issues/117)) ([e692aee](https://github.com/Adrizen89/fixtura/commit/e692aee89a7ba4668a247e2f8767e58ca66658ba))
* limitation de débit sur le login et les endpoints publics ([#116](https://github.com/Adrizen89/fixtura/issues/116)) ([#135](https://github.com/Adrizen89/fixtura/issues/135)) ([4568b76](https://github.com/Adrizen89/fixtura/commit/4568b76f2227a008905ad8b8d31546d2806711f1))
* palmarès (vainqueurs par édition) + bilan cumulé par équipe ([#109](https://github.com/Adrizen89/fixtura/issues/109)) ([#130](https://github.com/Adrizen89/fixtura/issues/130)) ([61f48ee](https://github.com/Adrizen89/fixtura/commit/61f48eec78cf339d0f91ee8fc957537cdec99c78))
* public team registration for tournaments ([#112](https://github.com/Adrizen89/fixtura/issues/112)) ([f11cf14](https://github.com/Adrizen89/fixtura/commit/f11cf14e297ff4ae029aa01c2a3ee0eb36f32253))
* repêchage des meilleurs 2ᵉˢ en phase finale hybride ([#107](https://github.com/Adrizen89/fixtura/issues/107)) ([2734266](https://github.com/Adrizen89/fixtura/commit/27342666c3d122c39a4afdc86c4a29a8f0df0a10))
* résolution d'un nul en élimination directe (tirs au but) ([#126](https://github.com/Adrizen89/fixtura/issues/126)) ([a5fc7b4](https://github.com/Adrizen89/fixtura/commit/a5fc7b4d5aed4b105c4d3dcf424a07dd26bf865f)), closes [#105](https://github.com/Adrizen89/fixtura/issues/105)
* suivi des erreurs serveur (Sentry) + endpoints de santé ([#118](https://github.com/Adrizen89/fixtura/issues/118)) ([6e0da65](https://github.com/Adrizen89/fixtura/commit/6e0da6501d9718daf42b7c542dfcf5922281368a))
* validation des inscriptions en ligne ([#113](https://github.com/Adrizen89/fixtura/issues/113)) + internationalisation FR/EN ([#123](https://github.com/Adrizen89/fixtura/issues/123)) ([#142](https://github.com/Adrizen89/fixtura/issues/142)) ([9ffe5d0](https://github.com/Adrizen89/fixtura/commit/9ffe5d01ce807981c668209f06c5cf2ff82fabc2))


### 🐛 Corrections

* **deps:** résout les vulnérabilités npm audit via override uuid ([#101](https://github.com/Adrizen89/fixtura/issues/101)) ([#143](https://github.com/Adrizen89/fixtura/issues/143)) ([27ae39a](https://github.com/Adrizen89/fixtura/commit/27ae39a169ed6ce0f38fa7c4a2caaf9b9ff22afa))


### 📝 Documentation

* exige Node 24 (min 22.18) et documente l'échec node ace sur Node 20 ([#145](https://github.com/Adrizen89/fixtura/issues/145)) ([b8f5f73](https://github.com/Adrizen89/fixtura/commit/b8f5f738082f2a142095cf5039e054e7118b2e66))
* guide produit « Comment fonctionne Fixtura » (HTML + PDF) ([#146](https://github.com/Adrizen89/fixtura/issues/146)) ([523ae91](https://github.com/Adrizen89/fixtura/commit/523ae91bbe760727b3e930f5148457872b0869d7))

## [0.1.6](https://github.com/Adrizen89/fixtura/compare/v0.1.5...v0.1.6) (2026-08-08)


### ✨ Fonctionnalités

* add Redis transport for transmit SSE multi-instance scaling ([#84](https://github.com/Adrizen89/fixtura/issues/84)) ([fbc3ebb](https://github.com/Adrizen89/fixtura/commit/fbc3ebba0d9863bfd512ab2c7d5b4ed713a65142)), closes [#37](https://github.com/Adrizen89/fixtura/issues/37)
* départage du classement par confrontation directe ([#33](https://github.com/Adrizen89/fixtura/issues/33)) ([#85](https://github.com/Adrizen89/fixtura/issues/85)) ([f32617b](https://github.com/Adrizen89/fixtura/commit/f32617b80f82f920ed9dae0a72ebcbbf5c95fb86))
* élimination directe au niveau événement multi-catégories ([#32](https://github.com/Adrizen89/fixtura/issues/32)) ([#90](https://github.com/Adrizen89/fixtura/issues/90)) ([1a75523](https://github.com/Adrizen89/fixtura/commit/1a75523ff1d699a3850ac98378ddf0255fe9b951))
* événements multi-catégories sur pool de terrains partagé ([#32](https://github.com/Adrizen89/fixtura/issues/32)) ([#89](https://github.com/Adrizen89/fixtura/issues/89)) ([9dee4d5](https://github.com/Adrizen89/fixtura/commit/9dee4d5294b94f0623121ade01af8bf5a16e4240))
* **export:** printable PDF exports for planning, match sheets & standings ([#86](https://github.com/Adrizen89/fixtura/issues/86)) ([a585bc8](https://github.com/Adrizen89/fixtura/commit/a585bc893bd6e89b57b3b48de9dca967f526f555)), closes [#38](https://github.com/Adrizen89/fixtura/issues/38)
* **multi-club:** scope global automatique, rôles/policies & contexte club ([#34](https://github.com/Adrizen89/fixtura/issues/34)) ([#92](https://github.com/Adrizen89/fixtura/issues/92)) ([7f74346](https://github.com/Adrizen89/fixtura/commit/7f7434650cd9bc07f8ef521ca87cc499a2abc18d))
* **onboarding:** inscription de club, invitations & gestion des membres ([#35](https://github.com/Adrizen89/fixtura/issues/35)) ([#94](https://github.com/Adrizen89/fixtura/issues/94)) ([8df3780](https://github.com/Adrizen89/fixtura/commit/8df3780aa8456a0e77728c01b6995d27b3ce57ec))
* **public:** notifications temps réel — prochain match & alertes par équipe ([#91](https://github.com/Adrizen89/fixtura/issues/91)) ([229946d](https://github.com/Adrizen89/fixtura/commit/229946d9bab432b1e1abf9b807c05486be007e84)), closes [#39](https://github.com/Adrizen89/fixtura/issues/39)
* **public:** QR code, PWA offline, club branding & TV mode ([#93](https://github.com/Adrizen89/fixtura/issues/93)) ([2f8829d](https://github.com/Adrizen89/fixtura/commit/2f8829dc4974e8452569adf40acf3949c8f4edc6)), closes [#40](https://github.com/Adrizen89/fixtura/issues/40)
* **rgpd:** pages légales, consentement, export & suppression des données ([#36](https://github.com/Adrizen89/fixtura/issues/36)) ([#88](https://github.com/Adrizen89/fixtura/issues/88)) ([e44be21](https://github.com/Adrizen89/fixtura/commit/e44be21d591f78ad0199db62c70cd120bac0fa5c))


### ⚡ Performances

* index matches (tournament_id, scheduled_at) + syncTournamentStatus agrégé ([#41](https://github.com/Adrizen89/fixtura/issues/41)) ([#95](https://github.com/Adrizen89/fixtura/issues/95)) ([f6fc397](https://github.com/Adrizen89/fixtura/commit/f6fc3970bc6247e089bc99db315a1c3989e1c1f6))


### ✅ Tests

* intégration temps réel SSE — saisie de score → écran public ([#30](https://github.com/Adrizen89/fixtura/issues/30)) ([#96](https://github.com/Adrizen89/fixtura/issues/96)) ([f61c33a](https://github.com/Adrizen89/fixtura/commit/f61c33aeb3c24b0b189442b0762fcd4e88b6b8e8))

## [0.1.5](https://github.com/Adrizen89/fixtura/compare/v0.1.4...v0.1.5) (2026-08-07)


### ✨ Fonctionnalités

* **brackets:** écran bracket + classements par poule ([#75](https://github.com/Adrizen89/fixtura/issues/75)) ([6d87842](https://github.com/Adrizen89/fixtura/commit/6d87842e6e8de2bda1f644ddbcce9ec96c7e29b1)), closes [#47](https://github.com/Adrizen89/fixtura/issues/47)
* **brackets:** persistance multi-phases + dispatch de format ([#72](https://github.com/Adrizen89/fixtura/issues/72)) ([203937f](https://github.com/Adrizen89/fixtura/commit/203937f396deb4385734b2f0253f5518d4a685aa)), closes [#46](https://github.com/Adrizen89/fixtura/issues/46)
* **brackets:** schéma des formats de tournoi (fondations [#42](https://github.com/Adrizen89/fixtura/issues/42)) ([#69](https://github.com/Adrizen89/fixtura/issues/69)) ([91d4a05](https://github.com/Adrizen89/fixtura/commit/91d4a054be189ea7c73a2bcb7c0f2ceb2e6a8b5d))
* **brackets:** sélecteur de format à la création/édition ([#74](https://github.com/Adrizen89/fixtura/issues/74)) ([b4e396d](https://github.com/Adrizen89/fixtura/commit/b4e396d7c20ae351e1f3f91a57394c9fe3b671de)), closes [#47](https://github.com/Adrizen89/fixtura/issues/47)
* **brackets:** service de progression du bracket ([#73](https://github.com/Adrizen89/fixtura/issues/73)) ([f2d559c](https://github.com/Adrizen89/fixtura/commit/f2d559cda271283f15ce1acac90a1976e386a490)), closes [#45](https://github.com/Adrizen89/fixtura/issues/45)
* **deps:** migration AdonisJS 6 → 7 + Inertia v4 ([#82](https://github.com/Adrizen89/fixtura/issues/82)) ([0cb082d](https://github.com/Adrizen89/fixtura/commit/0cb082d70d0fabcc66f094023570cb4487ead825)), closes [#76](https://github.com/Adrizen89/fixtura/issues/76)
* **results:** gestion des aléas du jour J (décalage, forfait, correction) ([#25](https://github.com/Adrizen89/fixtura/issues/25)) ([42bb1fc](https://github.com/Adrizen89/fixtura/commit/42bb1fc5a911fbe991265e858634953938ca298e)), closes [#6](https://github.com/Adrizen89/fixtura/issues/6)
* **scheduler:** moteur pur d'élimination directe (arbre + byes) ([#71](https://github.com/Adrizen89/fixtura/issues/71)) ([2658c00](https://github.com/Adrizen89/fixtura/commit/2658c006ef212ed0ebee1afd534d3590ee501bde)), closes [#44](https://github.com/Adrizen89/fixtura/issues/44)
* **scheduler:** moteur pur de la phase de poules (formats v2) ([#70](https://github.com/Adrizen89/fixtura/issues/70)) ([b3867c8](https://github.com/Adrizen89/fixtura/commit/b3867c8e9e02ad3f4d20c7f97310a813bbeced21)), closes [#43](https://github.com/Adrizen89/fixtura/issues/43)
* **ui:** finitions avant prod (validation FR, fonts self-hostées, a11y AA) ([#26](https://github.com/Adrizen89/fixtura/issues/26)) ([cf06272](https://github.com/Adrizen89/fixtura/commit/cf06272b52a5363b7d98568b2e30b932dad7f57e)), closes [#8](https://github.com/Adrizen89/fixtura/issues/8)


### 🐛 Corrections

* **auth:** normalisation d'email cohérente à la connexion (points Gmail) ([#27](https://github.com/Adrizen89/fixtura/issues/27)) ([cb962ee](https://github.com/Adrizen89/fixtura/commit/cb962ee49a5aa7e6a320704dbd14130fb9a982e6)), closes [#11](https://github.com/Adrizen89/fixtura/issues/11)


### ⚡ Performances

* temps réel sans rechargement + cache assets + gzip nginx ([#29](https://github.com/Adrizen89/fixtura/issues/29)) ([9f96707](https://github.com/Adrizen89/fixtura/commit/9f967070c88161288e344c2b43648edc786d9f3e))


### ♻️ Refactorisations

* **multi-tenant:** scope club_id réutilisable via Tournament.forClub ([#23](https://github.com/Adrizen89/fixtura/issues/23)) ([de45c08](https://github.com/Adrizen89/fixtura/commit/de45c08aef74bfd4b8f1b5752efda6d24edb66be)), closes [#7](https://github.com/Adrizen89/fixtura/issues/7)


### 📝 Documentation

* **claude:** actualise le cadrage — MVP construit, testé et déployé ([#28](https://github.com/Adrizen89/fixtura/issues/28)) ([f12d21b](https://github.com/Adrizen89/fixtura/commit/f12d21b300cb8f4911f90e5f5d979748cbec3bbc))

## [0.1.4](https://github.com/Adrizen89/fixtura/compare/v0.1.3...v0.1.4) (2026-08-05)


### ✨ Fonctionnalités

* **public:** écran public temps réel d'un tournoi (/t/:slug) ([#21](https://github.com/Adrizen89/fixtura/issues/21)) ([a5639c9](https://github.com/Adrizen89/fixtura/commit/a5639c9b5fb3ad27922212cc2a3abff63b518d6a))
* **public:** écran public temps réel d'un tournoi (/t/:slug) ([#22](https://github.com/Adrizen89/fixtura/issues/22)) ([cdc28b1](https://github.com/Adrizen89/fixtura/commit/cdc28b141a42bfa3eb6771463ec92eb8baa3ba1d))
* **realtime:** diffusion SSE des scores et du classement en direct ([#19](https://github.com/Adrizen89/fixtura/issues/19)) ([90dab0e](https://github.com/Adrizen89/fixtura/commit/90dab0ec25744ff17ed2a2f53b9af3f7b32b2308))

## [0.1.3](https://github.com/Adrizen89/fixtura/compare/v0.1.2...v0.1.3) (2026-08-05)


### ✨ Fonctionnalités

* **planning:** génération du planning (aperçu, validation, régénération) ([#16](https://github.com/Adrizen89/fixtura/issues/16)) ([d25b93e](https://github.com/Adrizen89/fixtura/commit/d25b93e5bd95cc64863ababf867e34464fafc099)), closes [#2](https://github.com/Adrizen89/fixtura/issues/2)
* **results:** saisie des scores multi-organisateurs + classement en direct ([#17](https://github.com/Adrizen89/fixtura/issues/17)) ([0a09708](https://github.com/Adrizen89/fixtura/commit/0a09708442d56bb506b75332551459321e3a5b78)), closes [#3](https://github.com/Adrizen89/fixtura/issues/3)
* **teams:** CRUD des équipes d'un tournoi (ajout/renommage/suppression) ([#13](https://github.com/Adrizen89/fixtura/issues/13)) ([7d80518](https://github.com/Adrizen89/fixtura/commit/7d805185acbeda76d0edb9254ca9ae9d6528a1f9)), closes [#1](https://github.com/Adrizen89/fixtura/issues/1)

## [0.1.2](https://github.com/Adrizen89/fixtura/compare/v0.1.1...v0.1.2) (2026-08-05)


### 🐛 Corrections

* charge nvm (fonction shell) avant usage dans le hook cloud ([9736281](https://github.com/Adrizen89/fixtura/commit/9736281b74274768fc0ad78aa06a92c3a889a216))

## [0.1.1](https://github.com/Adrizen89/fixtura/compare/v0.1.0...v0.1.1) (2026-08-05)


### ✨ Fonctionnalités

* **auth:** connexion organisateur par session + seed club/owner ([e0bde12](https://github.com/Adrizen89/fixtura/commit/e0bde1249bb5e2b0084444de6bab8e19c82b95a9))
* **db:** migrations et modèles Lucid (clubs, users, tournaments, teams, matches) ([3cd6bf1](https://github.com/Adrizen89/fixtura/commit/3cd6bf185fd0c263c989c257b916b3a1627263fc))
* **scheduler:** génération round-robin du planning (TS pur, 13 tests unitaires) ([5e1af9b](https://github.com/Adrizen89/fixtura/commit/5e1af9b423bb1c588ff96b4da15f7c3d5d684637))
* **tournaments:** CRUD des tournois (paramètres horaires + terrains) ([13afdfe](https://github.com/Adrizen89/fixtura/commit/13afdfea7055daf6641acf8374dbea64b5773eb8))
