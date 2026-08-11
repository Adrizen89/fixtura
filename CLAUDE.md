# CLAUDE.md — Fixtura

> Fichier lu automatiquement par Claude Code à chaque session. Il contient tout le contexte
> nécessaire pour développer sans re-poser de questions. Cadrage initial réalisé via le skill
> `chef-de-projet` (ADBDigital). **Le MVP est désormais construit, testé et déployé en
> production** — voir l'état d'avancement juste en dessous. Les sections §1–§13 restent la
> référence d'architecture, de conventions et de contraintes.

---

## État actuel — MVP livré ✅ (dernière maj : 2026-08-06)

> **Le MVP est construit, testé (46 tests unitaires verts) et déployé en production** sur le
> VPS Hostinger (`fixtura.fr`), version **0.1.4**. Pipeline CI/CD GitHub Actions (typecheck +
> lint + tests → build → déploiement SSH automatique sur push `main`) ; versioning via
> **release-please** (Conventional Commits → tags + CHANGELOG).
>
> **Tout le périmètre MVP (§3) est fonctionnel** : CRUD tournois & équipes, génération du
> planning (module `scheduler` pur, testé), saisie multi-organisateurs + classement en direct
> (service pur, testé), temps réel **SSE**, écran public `/t/:slug`, gestion des aléas
> (décalage, forfait _défaite 3–0_, correction de score), scoping `club_id` via le scope
> réutilisable `Tournament.forClub`, finitions (accessibilité AA, validation FR, fonts
> self-hostées).
>
> Les sections ci-dessous décrivent l'architecture et les conventions **désormais en place** —
> elles restent la référence. Le **§7** (ordre de développement) est conservé comme
> **historique** : toutes les étapes sont réalisées.

## 1. Identité du projet

- **Nom** : Fixtura
- **Nature** : produit d'ADBDigital (Adrien). Pas une prestation client ponctuelle : un outil pensé pour durer et, à terme, s'ouvrir à plusieurs clubs.
- **Type** : application web collaborative (pas un site vitrine).
- **Objectif en 1 phrase** : à partir des paramètres d'un tournoi, générer automatiquement un calendrier de matchs faisable, permettre la saisie des résultats à plusieurs le jour J, calculer le classement en direct, et le diffuser aux équipes via un affichage public.

## 2. Contexte & problème résolu

Un club de foot organise plusieurs tournois par an, aujourd'hui gérés dans un classeur Excel à formules. Trois douleurs :
1. Le classeur est reconstruit à chaque édition (le nombre d'équipes change).
2. Les formules ne gèrent pas les cas particuliers (terrains variables, contraintes de repos, pause déjeuner).
3. Aucun moyen simple de diffuser planning et résultats aux équipes le jour J.

**Cible v1 : un seul club.** L'architecture doit permettre l'ouverture à d'autres clubs plus tard, **sans que le multi-club soit développé en v1**.

## 3. Périmètre MVP

**Dans le périmètre :**
- Création d'un tournoi = 1 événement = 1 catégorie = 1 tournoi.
- Équipes : **nom uniquement**, aucune gestion de joueurs.
- Terrains : nombre variable.
- Paramètres horaires : heure de début, durée de match, durée de pause entre matchs, pause déjeuner.
- Format : **championnat** — toutes les équipes se rencontrent une fois (round-robin simple).
- Génération auto du planning, avec **garantie qu'aucune équipe ne joue deux créneaux consécutifs**.
- Saisie des résultats par plusieurs organisateurs simultanément.
- Classement calculé automatiquement en direct.
- Diffusion : écran public + lien mobile en lecture seule.
- Gestion des aléas : décalage de match, retard, forfait, correction de score.

**Hors périmètre v1 :** gestion des joueurs, autres formats (poules + élimination directe), UI de gestion multi-club / inscription de clubs, paiements, statistiques avancées.

## 4. Stack technique (choisie et justifiée)

| Couche | Choix | Justification |
|---|---|---|
| Backend | **AdonisJS 6** (TypeScript, ESM) | Framework MVC structuré « à la Laravel » : Lucid ORM, migrations, auth first-party, validators. Idéal produit maintenable/évolutif. Choix d'Adrien. |
| Rendu / front | **Inertia + Vue 3** (monolithe) | Un repo, un déploiement, pas d'API REST + JWT/CORS à gérer. Support Inertia officiel Adonis. SSR possible pour l'écran public. |
| Temps réel | **`@adonisjs/transmit`** (SSE) + `@adonisjs/transmit-client` | Push serveur→client natif Adonis. Le VPS le permet → **vrai live**, pas de polling. Transport en mémoire en v1 (instance unique) ; **transport Redis** activable (`REDIS_HOST`) pour le fan-out multi-instances — prérequis de scaling, cf. §11. |
| ORM / DB | **Lucid + PostgreSQL** | Meilleur choix produit (contraintes, futur multi-club). Migrations versionnées. |
| Auth | **`@adonisjs/auth`** — guard **session** (web) | Parfait pour une app Inertia. Hash scrypt par défaut. |
| Validation | **VineJS** (`@vinejs/vine`) | Validator natif Adonis 6. |
| CSS | **Tailwind CSS** (via Vite) | Défaut ADBDigital. Composants maison, pas de lib UI lourde. |
| Fonts | **Self-hostées (woff2 locaux)** | RGPD : pas de Google Fonts CDN sur les livrables (préférence ADBDigital). |
| Hébergement | **Hostinger VPS** + PM2 + nginx (reverse proxy) + Let's Encrypt | Imposé par Adonis (serveur Node persistant). Débloque SSE + Postgres. |

> **Node** : LTS ≥ 20. **Gestionnaire** : npm (sauf indication contraire).

## 5. Architecture & modèle de données

Multi-tenant-ready : une colonne `club_id` sur les entités racines **dès le jour 1**, même avec un seul club en base. **Fondation multi-club posée en v2 (issue #34)** : scope global automatique sur `club_id` (`TenantContext` + mixin `withTenantScope`), rôles + policies, contexte du club courant. **Onboarding livré en v2 (issue #35)** : inscription publique d'un club (`/register` → club + premier `owner`), invitations d'organisateurs par **lien + jeton + expiration** (`/invitations/:token`), gestion des membres (`/membres`, owner). Reste éventuellement, plus tard : la sélection de club multi-adhésion — **sans migration douloureuse**.

Modèle (tables pluriel snake_case / modèles Lucid singulier PascalCase) :

- **clubs** `(id, name, slug, created_at, updated_at)` — racine multi-tenant, **1 seule ligne en v1**.
- **users** `(id, club_id, full_name, email, password, role[owner|organizer], created_at, updated_at)` — les organisateurs. Se connectent pour saisir. Rôle exposé via `User.isOwner` (policies).
- **events** `(id, club_id, name, event_date, start_time, match_duration_min, break_duration_min, lunch_start, lunch_duration_min, num_terrains, status[draft|scheduled|live|finished], public_slug, created_at, updated_at)` — **v2 (#32)** : un événement regroupe plusieurs catégories (tournois) le même jour sur un **pool de terrains partagé** ; il porte les paramètres **communs** (date, rythme, terrains). Cloisonnement par club **automatique** (mixin `withTenantScope`, issue #34) ; scope nommé `Event.forClub` conservé pour les usages hors requête. Écran public `/e/:public_slug`.
- **tournaments** `(id, club_id, event_id?, name, category, event_date, start_time, match_duration_min, break_duration_min, lunch_start, lunch_duration_min, num_terrains, win_points, draw_points, loss_points, status[draft|scheduled|live|finished], public_slug, format, format_config, created_at, updated_at)`. `win_points`/`draw_points`/`loss_points` (défaut 3/1/0) — barème configurable (#104). `registration_open`/`registration_token`/`registration_capacity` (v3 #112) — **inscription publique** d'équipes : intention de l'orga, jeton non devinable du lien (distinct du `public_slug` des résultats), capacité facultative ; la « fermeture pleine » est **dérivée** du nombre d'équipes (jamais stockée). `event_id` **nullable** (v2 #32) : un tournoi autonome (v1) n'a pas d'événement ; une catégorie d'un événement le référence (le pool de terrains + le rythme viennent alors de l'événement). La migration a rétro-converti chaque tournoi v1 en **un événement à une catégorie**. `format` ∈ `championship|pools|knockout|hybrid|swiss` (suisse #110) ; `format_config` (JSON) porte les paramètres du format : `numPools`, `qualifiersPerPool`, `thirdPlace`, et `swissRounds` (facultatif — auto ⌈log₂N⌉ si absent).
- **teams** `(id, tournament_id, name, contact_email?, created_at, updated_at)` — nom uniquement (aucune gestion de joueurs). `contact_email` **nullable** (v3 #112) : renseigné lors d'une **inscription publique** (cf. ci-dessous) ; donnée personnelle **jamais exposée sur l'écran public**.
- **matches** `(id, tournament_id, round_number, terrain_number, scheduled_at, home_team_id, away_team_id, home_score, away_score, status[scheduled|live|finished|forfeit], forfeit_team_id?, updated_by_user_id, created_at, updated_at)`.
- **invitations** `(id, club_id, email, role[owner|organizer], token, invited_by_user_id?, expires_at, accepted_at?, created_at, updated_at)` — **v2 (#35)** : invitation d'un organisateur par lien non devinable (jeton + expiration). Tenant-scopé (mixin `withTenantScope`) ; l'acceptation publique (`/invitations/:token`, hors contexte tenant) crée l'utilisateur dans le club avec le rôle prévu. Logique isolée : `app/services/invitations.ts` + `app/services/invitation_delivery.ts` (envoi email branchable, log du lien en v2).

**Classement : jamais stocké en base.** Calculé à la volée par un service pur à partir des `matches` terminés.
Règles foot : victoire = 3 pts, nul = 1, défaite = 0 **par défaut** — barème **configurable par tournoi** (issue #104 : colonnes `win_points`/`draw_points`/`loss_points`, exposées via `Tournament.scoring` et passées au service pur `computeStandings(teams, matches, scoring)`, qui reste sans DB). Départage (issue #33, implémenté) : points → **confrontation directe** → différence de buts → buts marqués (puis nom, pour un ordre déterministe). La confrontation directe est un mini-classement calculé sur les seuls matchs entre les équipes à égalité, réappliqué récursivement pour les égalités à 3+ équipes (`app/services/standings.ts`).

### Écrans / routes

- **Admin (auth session)** :
  - Tableau de bord des tournois.
  - Création / édition d'un tournoi (paramètres horaires + terrains).
  - Gestion des équipes du tournoi.
  - Génération du planning : aperçu → validation → régénération.
  - Grille de saisie des résultats (live).
  - Gestion des aléas : décaler un match, forfait, corriger un score.
  - **Historique** (`/historique` — #108) : liste en lecture seule des éditions **terminées** (événements + tournois autonomes), scopée club, triée par date. Les tableaux de bord (tournois/événements) ne montrent que les éditions **actives** (non `finished`) ; la consultation figée d'une édition passée réutilise l'écran public (`/t/:slug`, `/e/:slug`).
  - **Palmarès** (`/palmares` — #109) : vainqueur/finaliste de chaque édition terminée + bilan cumulé par équipe (participations, titres, finales, ratio), agrégé sur **toutes** les éditions terminées (y compris les catégories d'un événement). Calcul par service **pur** `app/services/palmares.ts` (jamais stocké) : vainqueur = vainqueur de la finale de tableau (élimination/hybride) sinon 1er du classement général (championnat/poules, barème #104). Agrégation par **nom** d'équipe.
  - **Gestion des membres** (`/membres`, **owner** — #35) : inviter (lien + jeton), révoquer, changer un rôle, retirer.
  - **Inscriptions en ligne** (page du tournoi, #112) : ouvrir/fermer le lien public d'inscription, fixer une capacité, copier le lien. Contact des équipes inscrites visible ici (jamais en public).
- **Public (sans auth)** :
  - Écran d'un tournoi via `/t/:public_slug` : planning, résultats, classement en direct. **Mobile-first** (le « lien mobile lecture seule ») **et** lisible de loin (TV / vidéoprojecteur). Auto-refresh via SSE, aucune interaction requise.
  - **Onboarding (invités — #35)** : inscription d'un club (`/register`), acceptation d'une invitation (`/invitations/:token`), pages légales (`/mentions-legales`, `/cgu`, `/confidentialite`).
  - **Inscription d'une équipe (#112)** : `/inscription/:registration_token` — formulaire public (nom + contact), **sans compte, sans paiement**. Affiche l'état fermé/ouvert/complet ; anti-spam **honeypot + rate-limit** (`app/services/rate_limit.ts`, en mémoire — v1 instance unique). Logique isolée dans `app/services/team_registration.ts`.

## 6. Module critique — Génération du planning

**C'est le cœur du projet et le composant le plus risqué.** À isoler dans `app/services/scheduler/` en **TypeScript pur** (aucune dépendance DB) pour être **testable unitairement**.

Deux étapes :
1. **Appariements** — round-robin (méthode du cercle / tables de Berger) : chaque équipe rencontre chaque autre une fois. N pair → N−1 journées ; N impair → N journées avec un « bye » tournant.
2. **Placement** — assigner les matchs aux créneaux (time slots) × terrains en respectant :
   - aucune équipe ne joue **deux créneaux consécutifs** (contrainte dure) ;
   - une équipe ne joue jamais deux matchs en parallèle ;
   - pause déjeuner insérée au bon moment ;
   - nombre de terrains **variable** ;
   - durée de match + pause entre matchs.
   Approche : glouton avec backtracking (ou modélisation ordonnancement). **Garantir la faisabilité, ou remonter une erreur explicite** du type « infaisable avec ces paramètres : augmentez le nombre de terrains ou réduisez la pause ». **Jamais** un planning silencieusement invalide.

**Tests unitaires obligatoires** couvrant : nombre pair/impair d'équipes, 1 terrain vs plusieurs, contrainte de repos respectée, pause déjeuner, et cas infaisable (doit lever une erreur claire).

**Formats v2/v3** (au-delà du championnat) : poules, élimination directe, hybride
(poules + phase finale) — cf. `app/services/scheduler/formats.ts` (`generatePhased`) +
progression des slots différés (`bracket_progression.ts`). **Système suisse (#110)** :
moteur pur `app/services/scheduler/swiss.ts` (`pairSwissRound` — appariement par
proximité de classement, sans rematch via backtracking, bye rotatif ; `defaultSwissRounds`
= ⌈log₂N⌉). Particularité : les appariements d'une ronde dépendent du **classement
après** la ronde précédente — il ne se génère donc **pas** d'avance mais **ronde par
ronde** (`app/services/swiss.ts`) : la ronde 1 au planning, puis chaque ronde suivante
**automatiquement** à la saisie des scores (dans la transaction, comme la progression
des brackets — `ResultsController.progress`), jusqu'à `format_config.swissRounds` (ou le
défaut). Le **bye** est une victoire d'office matérialisée en match à un seul côté,
créditée au classement via `computeStandings(teams, matches, scoring, byes)`. Tournois
autonomes uniquement (pas en événement multi-catégories).
**Double élimination (#111)** : moteur pur `app/services/scheduler/double_elimination.ts`
(`buildDoubleElimination`) — tableau principal (gagnants) + repêchage (losers, alternance
tours mineurs/majeurs, perdants descendus via la source `match_loser`) + **grande finale
unique** (pas de bracket reset en v1 — évolution possible). Byes attribués aux têtes de
série (helpers partagés `scheduler/seeding.ts`) ; ordonnancement par bandes topologiques
(comme l'élimination directe) ; codes de tour `wb-r{n}` / `lb-r{n}` / `gf`. Persistance et
progression **génériques** (aucune adaptation : la descente des perdants passe par
`match_loser`). Rendu : `inertia/components/DoubleEliminationBracket.vue`. Le vainqueur
d'une double élimination = vainqueur de la grande finale (palmarès #109 et classement
final #106 alignés).

## 7. Stratégie de développement — réalisée (historique)

> **Toutes les étapes ci-dessous sont livrées.** L'ordre est conservé comme trace du déroulé
> et repère pour de futures évolutions.

1. Setup : `npm init adonisjs` (starter web + Inertia/Vue), Tailwind, Postgres, config `.env`, git.
2. Migrations & modèles Lucid : clubs, users, tournaments, teams, matches.
3. Auth session : login orga, middleware `auth`, seed d'un club + un user `owner`.
4. CRUD Tournoi (paramètres horaires + terrains) — écrans admin.
5. CRUD Équipes rattachées au tournoi.
6. **Module `scheduler` (pur + testé)** — développé isolément **avant** l'UI de génération.
7. UI génération du planning : aperçu, validation, régénération.
8. Grille de saisie des résultats + **service de classement pur (testé)**.
9. Temps réel : `@adonisjs/transmit` — pousser maj scores/classement aux abonnés.
10. Écran public `/t/:slug` : planning + résultats + classement live, mobile-first + lisible de loin.
11. Gestion des aléas : décaler, forfait, correction de score.
12. Vérifier le scoping `club_id` partout (préparer un query scope global). **Pas d'UI multi-club.**
13. Finitions : validation VineJS, messages d'erreur, états vides, responsive, accessibilité.
14. Déploiement (géré par Adrien, cf. §11).

## 8. Conventions

- **TypeScript strict.** Conventions Adonis 6 (contrôleurs resourceful, routes dans `start/routes.ts`).
- **Commits : Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`…).
- **Nommage** : modèles singuliers (`Tournament`), tables pluriel snake_case (`tournaments`), pages Inertia dans `inertia/pages`.
- **Accessibilité WCAG AA minimum.** L'écran public : très gros contrastes, grandes typos (lisible à distance).
- **Mobile-first** — le lien public mobile est central.
- **Logique métier hors des contrôleurs** : services (`app/services/`), contrôleurs minces.

## 9. Points d'attention (à ne jamais oublier)

- **Écran public = double contexte** : projeté sur TV/vidéoprojecteur **et** consulté sur mobile par les équipes. Très lisible, auto-refresh sans interaction.
- **Faisabilité du planning garantie ou erreur explicite.** Jamais de planning invalide silencieux.
- **Scores toujours corrigeables** (erreur de saisie fréquente le jour J). Historiser `updated_by_user_id` + `updated_at`.
- **Concurrence** : deux orgas saisissent le même match → « dernier écrit gagne » + affichage de qui a saisi. Pas de verrou complexe en v1.
- `club_id` présent partout dès maintenant, même avec un seul club.
- **Cloisonnement par club automatique (issue #34)** : le club courant est porté par
  `TenantContext` (AsyncLocalStorage), ouvert par le `tenant_middleware` juste après
  `auth`. Le mixin `withTenantScope` (sur `Tournament` et `Event`) filtre alors
  **toute lecture** sur `club_id` — les contrôleurs n'appliquent **plus** `forClub`
  (un tournoi/événement d'un autre club → liste filtrée, `firstOrFail` → 404). Hors
  requête (CLI `club:export`/`club:delete`, seeders, fixtures de test) aucun club
  courant → pas de filtre : les scopes nommés `forClub` restent utilisés là où l'on
  cible un club **explicite** (`app/services/club_data.ts`). Les écritures fixent
  toujours `club_id` explicitement à partir de l'utilisateur connecté.
- **Rôles & autorisations (issue #34)** : rôles `owner` / `organizer` consolidés
  (`app/models/user.ts`) ; les policies (`app/policies/*`) gardent les actions
  destructrices/de gestion du club au responsable (`owner`) : suppression d'un
  tournoi/événement/catégorie, export RGPD. Le club courant est exposé aux pages
  Inertia (`currentClub`) et affiché dans l'en-tête admin.
- Le **forfait** est un statut de match (`status = 'forfeit'`), pas une suppression. **Règle retenue en v1 (implémentée, issue #6) : défaite 3–0** — l'adversaire gagne 3–0, comptée comme une victoire normale (3 pts). Le score réglementaire est **matérialisé en base** au moment du forfait, si bien que le service de classement (pur, sans notion de forfait) l'intègre naturellement. Reste corrigeable : saisir un score réel termine le match et annule le forfait. Convention isolée dans `app/services/match_incidents.ts` (`FORFEIT_WIN_SCORE` / `FORFEIT_LOSS_SCORE`).

## 10. Sécurité & RGPD

- Auth session Adonis, mots de passe hashés (scrypt par défaut). Pas de secret en dur, tout en `.env`.
- Écran public strictement **lecture seule**, accessible par `public_slug` non devinable.
- Données minimales (nom d'équipe, email organisateur) → RGPD léger.
- Fonts self-hostées (woff2), pas de CDN tiers traçant.
- **Limitation de débit (issue #116)** : middleware nommé `throttle`
  (`app/middleware/throttle_middleware.ts`) sur le limiteur **en mémoire**
  `app/services/rate_limit.ts` (fenêtre glissante par IP). Appliqué aux endpoints
  sensibles : login (anti-bruteforce, 10/5 min), inscription d'un club (5/h), écrans
  publics `/t` `/e` (300/min, garde-fou anti-scraping), formulaire d'inscription
  public en lecture (60/min). Dépassement → **429** + `Retry-After`, limites
  généreuses pour ne pas gêner l'usage légitime (stade derrière une même IP). La
  **soumission** d'inscription (#112) garde son anti-spam propre (honeypot +
  rate-limit avec repli flash). Store mémoire (v1 instance unique, cf. §11) ; un
  store Redis prendra le relais en cluster sans changer l'API.
- **Conformité RGPD implémentée (issue #36)** : pages publiques `/mentions-legales`,
  `/cgu`, `/confidentialite` ; mention de consentement à la connexion ; portabilité
  (export JSON du club en libre-service pour l'`owner` via `/compte/export`, ou CLI
  `node ace club:export`) et effacement (`node ace club:delete`) — logique isolée
  dans `app/services/club_data.ts`. Registre + procédures : **`docs/rgpd.md`**.
  Confirmé : **aucune ressource tierce traçante** (fonts self-hostées, ni analytics
  ni CDN externe ; cookies strictement nécessaires session + anti-CSRF).
- **Journal d'audit (issue #117)** : table append-only `audit_logs` (`club_id`,
  `user_id?`, `actor_email` instantané, `action`, `target?`, `metadata` JSON, `ip`,
  `created_at`) tracant les actions sensibles — connexion, invitation / changement
  de rôle / retrait d'un membre, révocation d'invitation, suppression
  tournoi / événement / catégorie, export RGPD. Écriture **best-effort** via
  `app/services/audit_log.ts` (`recordAudit` — n'échoue jamais l'action métier ;
  logique isolée hors contrôleurs). Consultation `/journal` réservée au responsable
  (`AuditPolicy.view`, owner), scopée club, paginée. **2FA owner : différé**
  (marqué optionnel dans l'issue ; évolution possible).

## 11. Déploiement

- **Cible : Hostinger VPS** (Node LTS, PostgreSQL, PM2, nginx reverse proxy, SSL Let's Encrypt).
- Build Adonis : `node ace build` → dossier `build/`, puis `node ace migration:run --force` en prod.
- **Le déploiement est géré par Adrien lui-même.** Ne pas rédiger de procédure pas-à-pas VPS/SFTP ni de `DEPLOY.md` (préférence ADBDigital). Se limiter à lister les pré-requis techniques si on en manque.
- **Scaling multi-instances (prérequis) — transport Redis pour transmit** (issue #37) : en instance unique (PM2 mode fork, v1), transmit garde les abonnements SSE en mémoire — aucun service externe requis. Pour passer **PM2 en cluster** (plusieurs instances, montée en charge / multi-club), il faut d'abord un **transport partagé** sinon les broadcasts SSE ne se diffusent pas entre instances. Activation : renseigner `REDIS_HOST` (+ `REDIS_PORT`/`REDIS_PASSWORD`) dans `build/.env` → `config/transmit.ts` bascule automatiquement sur le driver Redis (`@adonisjs/transmit/transports`, via `ioredis`) ; puis démarrer PM2 avec `PM2_INSTANCES=max` (cf. `ecosystem.config.cjs`). Redis reste **optionnel en local** (absent → repli en mémoire). Pré-requis VPS supplémentaire dans ce cas : un serveur Redis (local, non exposé).

## 12. Workflow ADBDigital

`chef-de-projet` (✅) → `développement` (✅ MVP livré, stack Adonis) → **`performance-audit`** (étape recommandée avant d'élargir le périmètre) → déploiement VPS (✅ en place : CI/CD + PM2 + nginx, géré par Adrien).
Le skill `client-deployer` vise Hostinger **mutualisé** : il ne s'applique pas ici (VPS custom).

## 13. À NE PAS FAIRE

- ❌ ~~Coder la gestion multi-club / l'inscription de clubs en v1 (juste la colonne `club_id`).~~ **v1 : tenu.** Fondation multi-club en **v2 (#34)** ; **onboarding + invitations + gestion des membres en v2 (#35)**. Reste hors périmètre tant que non demandé : **UI de sélection de club** (multi-adhésion d'un utilisateur à plusieurs clubs) et l'**envoi email SMTP réel** des invitations (aujourd'hui : lien partageable + seam d'envoi).
- ❌ Retomber sur du polling : on a le VPS → **SSE via transmit**.
- ❌ Ajouter une lib UI lourde (rester Tailwind + composants maison).
- ❌ Stocker le classement en base (calcul à la volée dans un service).
- ❌ Gérer les joueurs (équipes = **nom uniquement**).
- ❌ Supporter d'autres formats que le championnat en v1 (pas de poules + élimination).
- ❌ Mettre de la logique métier dans les contrôleurs (→ services).
