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
const PublicController = () => import('#controllers/public_controller')

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
router.on('/').redirect('/tournaments')

/**
 * Écran public d'un tournoi — sans auth, via le `public_slug` non devinable.
 * Lecture seule (planning, résultats, classement en direct), mobile-first et
 * lisible de loin. Rafraîchissement via SSE (canal `tournaments/{public_slug}`).
 */
router.get('/t/:slug', [PublicController, 'show']).as('public.tournament')

/**
 * Authentification — accessible aux invités uniquement.
 */
router
  .group(() => {
    router.get('/login', [AuthController, 'showLogin']).as('login.show')
    router.post('/login', [AuthController, 'login']).as('login')
  })
  .use(middleware.guest())

router.post('/logout', [AuthController, 'logout']).as('logout').use(middleware.auth())

/**
 * Espace admin — organisateurs authentifiés.
 */
router
  .group(() => {
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
  })
  .use(middleware.auth())
