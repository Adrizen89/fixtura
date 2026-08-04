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
  })
  .use(middleware.auth())
