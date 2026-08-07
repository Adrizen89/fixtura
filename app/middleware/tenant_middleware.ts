import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { TenantContext } from '#tenancy/tenant_context'

/**
 * Établit le **club courant** de la requête (issue #34, fondation multi-club).
 *
 * À placer **après** `auth` : l'utilisateur est alors chargé, et l'on ouvre le
 * contexte tenant sur son `club_id` pour toute la chaîne descendante. Le scope
 * global des modèles racines (`Tournament`, `Event`) lit ce contexte et filtre
 * automatiquement — plus de `forClub` manuel dans les contrôleurs.
 *
 * Le club courant est aujourd'hui l'unique club de l'utilisateur ; la mécanique est
 * prête pour une future sélection de club (adhésions multiples), qui n'aurait qu'à
 * résoudre un autre `club_id` (validé) ici.
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth?.user
    if (!user) {
      return next()
    }

    return TenantContext.run(user.clubId, next)
  }
}
