# Changelog

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
