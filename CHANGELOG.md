# Changelog

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
