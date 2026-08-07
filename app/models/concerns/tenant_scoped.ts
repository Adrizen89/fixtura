import { BaseModel, beforeFind, beforeFetch } from '@adonisjs/lucid/orm'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { TenantContext } from '#tenancy/tenant_context'

/**
 * Scope global multi-tenant (issue #34) : filtre automatiquement toute lecture d'un
 * modèle racine sur le `club_id` du **club courant** (cf. `TenantContext`). Appliqué
 * via `compose(BaseModel, withTenantScope())` sur `Tournament` et `Event`.
 *
 * Remplace l'application manuelle de `Tournament.forClub` / `Event.forClub` dans les
 * contrôleurs : un tournoi/événement d'un autre club devient **invisible**
 * (liste filtrée, `firstOrFail` → 404) sans que chaque contrôleur ait à y penser.
 * Hors requête (CLI, seeders, fixtures de test), aucun club courant → aucun filtre.
 *
 * Le scope ne concerne que la **lecture** : les écritures (`create`) fixent
 * explicitement `club_id` à partir de l'utilisateur connecté, comme auparavant.
 */
function applyTenantScope(query: ModelQueryBuilderContract<LucidModel>) {
  const clubId = TenantContext.currentClubId()
  if (clubId !== null) {
    // Colonne qualifiée par la table → sans ambiguïté avec les préchargements/joins.
    query.where(`${query.model.table}.club_id`, clubId)
  }
}

export function withTenantScope() {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
    class TenantScoped extends superclass {
      @beforeFind()
      static tenantScopeOnFind(query: ModelQueryBuilderContract<LucidModel>) {
        applyTenantScope(query)
      }

      @beforeFetch()
      static tenantScopeOnFetch(query: ModelQueryBuilderContract<LucidModel>) {
        applyTenantScope(query)
      }
    }

    return TenantScoped
  }
}
