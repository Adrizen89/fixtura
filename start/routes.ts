/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const TournamentsController = () => import('#controllers/tournaments_controller')
const TeamsController = () => import('#controllers/teams_controller')
const PlanningController = () => import('#controllers/planning_controller')
const ResultsController = () => import('#controllers/results_controller')
const ExportController = () => import('#controllers/export_controller')
const PublicController = () => import('#controllers/public_controller')
const EventsController = () => import('#controllers/events_controller')
const EventPlanningController = () => import('#controllers/event_planning_controller')
const PublicEventController = () => import('#controllers/public_event_controller')
const LegalController = () => import('#controllers/legal_controller')
const AccountController = () => import('#controllers/account_controller')
const RegistrationController = () => import('#controllers/registration_controller')
const InvitationsController = () => import('#controllers/invitations_controller')
const MembersController = () => import('#controllers/members_controller')
const ClubController = () => import('#controllers/club_controller')
const QrController = () => import('#controllers/qr_controller')

/**
 * Routes du temps réel (SSE) : `__transmit/events` (flux), `__transmit/subscribe`
 * et `__transmit/unsubscribe`. Volontairement **publiques** : l'écran public
 * (lecture seule, sans auth) doit pouvoir s'abonner au flux d'un tournoi. Elles
 * sont exemptées du CSRF (cf. config/shield.ts) — simple abonnement à des données
 * déjà publiques.
 */
transmit.registerRoutes()

/**
 * Racine → liste des tournois. Si non connecté, le middleware `auth` renverra
 * automatiquement vers /login.
 */
router.on('/').redirect('tournaments.index')

/**
 * Écran public d'un tournoi — sans auth, via le `public_slug` non devinable.
 * Lecture seule (planning, résultats, classement en direct), mobile-first et
 * lisible de loin. Rafraîchissement via SSE (canal `tournaments/{public_slug}`).
 */
router.get('/t/:slug', [PublicController, 'show']).as('public.tournament')

/**
 * Écran public d'un **événement** multi-catégories (#32) — sans auth, via le
 * `public_slug`. Agrège les catégories de l'événement et permet de naviguer entre
 * elles (planning + classement en direct de chacune). Lecture seule, mobile-first
 * et lisible de loin, rafraîchi via SSE (un canal par catégorie).
 */
router.get('/e/:slug', [PublicEventController, 'show']).as('public.event')

/**
 * Pages légales — publiques, sans auth (information des personnes exigée par le
 * RGPD, cf. CLAUDE.md §10 · issue #36). Mentions légales, CGU, confidentialité.
 */
router.get('/mentions-legales', [LegalController, 'mentions']).as('legal.mentions')
router.get('/cgu', [LegalController, 'terms']).as('legal.terms')
router.get('/confidentialite', [LegalController, 'privacy']).as('legal.privacy')

/**
 * Authentification — accessible aux invités uniquement.
 */
router
  .group(() => {
    router.get('/login', [AuthController, 'showLogin']).as('login.show')
    router.post('/login', [AuthController, 'login']).as('login')

    // Onboarding (issue #35) : inscription d'un club (crée club + owner).
    router.get('/register', [RegistrationController, 'show']).as('register.show')
    router.post('/register', [RegistrationController, 'register']).as('register')

    // Acceptation d'une invitation d'organisateur via jeton non devinable.
    router.get('/invitations/:token', [InvitationsController, 'show']).as('invitations.show')
    router.post('/invitations/:token', [InvitationsController, 'accept']).as('invitations.accept')
  })
  .use(middleware.guest())

router.post('/logout', [AuthController, 'logout']).as('logout').use(middleware.auth())

/**
 * Espace admin — organisateurs authentifiés.
 */
router
  .group(() => {
    // Événements multi-catégories (#32) : CRUD, gestion des catégories et
    // génération du planning combiné sur le pool de terrains partagé.
    router.resource('events', EventsController)
    router
      .post('/events/:id/categories', [EventsController, 'storeCategory'])
      .as('events.categories.store')
    router
      .delete('/events/:id/categories/:categoryId', [EventsController, 'destroyCategory'])
      .as('events.categories.destroy')
    router
      .get('/events/:id/planning', [EventPlanningController, 'preview'])
      .as('events.planning.preview')
    router
      .post('/events/:id/planning', [EventPlanningController, 'store'])
      .as('events.planning.store')

    // Portabilité RGPD : l'organisateur `owner` télécharge les données de son club.
    router.get('/compte/export', [AccountController, 'exportData']).as('account.export')

    // Gestion des membres du club (issue #35) — réservé au responsable (owner).
    router.get('/membres', [MembersController, 'index']).as('members.index')
    router.post('/membres/invitations', [MembersController, 'invite']).as('members.invite')
    router
      .delete('/membres/invitations/:id', [MembersController, 'revokeInvitation'])
      .as('members.invitations.revoke')
    router.patch('/membres/:id/role', [MembersController, 'updateRole']).as('members.role')
    router.delete('/membres/:id', [MembersController, 'remove']).as('members.remove')

    // Personnalisation du club : logo + couleur sur l'écran public (issue #40).
    router.get('/club/apparence', [ClubController, 'edit']).as('club.appearance.edit')
    router.post('/club/apparence', [ClubController, 'update']).as('club.appearance.update')

    router.resource('tournaments', TournamentsController)
    // Équipes gérées depuis la page du tournoi (ajout / renommage / suppression).
    router.resource('tournaments.teams', TeamsController).only(['store', 'update', 'destroy'])
    // Génération du planning : aperçu (GET) puis validation/persistance (POST).
    router
      .get('/tournaments/:id/planning', [PlanningController, 'preview'])
      .as('tournaments.planning.preview')
    router
      .post('/tournaments/:id/planning', [PlanningController, 'store'])
      .as('tournaments.planning.store')
    // Saisie des résultats (grille + classement en direct) et mise à jour d'un score.
    router.get('/tournaments/:id/results', [ResultsController, 'index']).as('tournaments.results')
    router
      .patch('/tournaments/:id/matches/:matchId', [ResultsController, 'update'])
      .as('tournaments.matches.update')
    // Aléas du jour J : décaler un match, déclarer un forfait (cf. issue #6).
    router
      .patch('/tournaments/:id/matches/:matchId/schedule', [ResultsController, 'reschedule'])
      .as('tournaments.matches.reschedule')
    router
      .patch('/tournaments/:id/matches/:matchId/forfeit', [ResultsController, 'forfeit'])
      .as('tournaments.matches.forfeit')
    // Export / impression PDF (jour J) : planning, feuilles de match, classement
    // (cf. issue #38). Documents Edge autonomes → impression native « Enregistrer en PDF ».
    router
      .get('/tournaments/:id/export/planning', [ExportController, 'planning'])
      .as('tournaments.export.planning')
    // QR code (SVG) vers l'écran public du tournoi, à afficher au bord des terrains (#40).
    router.get('/tournaments/:id/qrcode', [QrController, 'tournament']).as('tournaments.qrcode')
    router
      .get('/tournaments/:id/export/match-sheets', [ExportController, 'matchSheets'])
      .as('tournaments.export.matchSheets')
    router
      .get('/tournaments/:id/export/standings', [ExportController, 'standings'])
      .as('tournaments.export.standings')
  })
  // `auth` charge l'utilisateur, puis `tenant` ouvre le contexte du club courant
  // (scope global automatique — cf. issue #34). L'ordre est important.
  .use([middleware.auth(), middleware.tenant()])
