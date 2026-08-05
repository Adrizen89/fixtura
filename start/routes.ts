/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const TournamentsController = () => import('#controllers/tournaments_controller')
const TeamsController = () => import('#controllers/teams_controller')
const PlanningController = () => import('#controllers/planning_controller')
const ResultsController = () => import('#controllers/results_controller')

/**
 * Racine → liste des tournois. Si non connecté, le middleware `auth` renverra
 * automatiquement vers /login.
 */
router.on('/').redirect('/tournaments')

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
  })
  .use(middleware.auth())
