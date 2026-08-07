import { placeMatches } from './placement.js'
import { SchedulerError } from './errors.js'
import type { Pairing } from './types.js'

/**
 * Placement **inter-catégories** sur un pool de terrains partagé — moteur **pur**
 * (aucune dépendance DB), cf. CLAUDE.md §6 · issue #32 (événements multi-catégories).
 *
 * Un événement fait tourner plusieurs catégories (U9 / U11 / U13…) le même jour sur
 * un **pool de terrains commun**. Il faut donc placer les matchs de TOUTES les
 * catégories sur une **grille unique** créneau × terrain, sans jamais que deux
 * matchs (quelle que soit leur catégorie) occupent le même couple (créneau, terrain).
 *
 * Observation clé : les équipes sont **disjointes entre catégories** (identifiants
 * DB distincts). On peut donc réutiliser tel quel le solveur `placeMatches` sur
 * l'**union** des appariements de toutes les catégories :
 *  - la contrainte « pas deux créneaux consécutifs pour une même équipe » ne couple
 *    jamais deux catégories (leurs équipes ne se recroisent pas) → elle reste vraie
 *    à l'intérieur de chaque catégorie ;
 *  - la seule contrainte **partagée** est « au plus `numTerrains` matchs par
 *    créneau », qui est exactement le plafond appliqué par `placeMatches` sur le
 *    pool commun.
 *
 * Le placement glouton entrelace donc les catégories dans les mêmes créneaux
 * (parallélisme maximal du pool), et on ré-étiquette ensuite chaque match placé
 * avec sa catégorie via le couple (domicile, extérieur), unique globalement.
 */

/** Un appariement d'une catégorie, enrichi de ses métadonnées de phase. */
export interface CategoryPairing extends Pairing {
  /** Phase du match : `main` (championnat) ou `pool` (poules). */
  stage: 'main' | 'pool'
  /** Étiquette de poule (`A`, `B`…) pour le format poules ; null en championnat. */
  groupLabel: string | null
}

/** Les appariements d'une catégorie (= un tournoi) à placer sur la grille partagée. */
export interface CategoryInput {
  /** Identifiant de la catégorie (= id du tournoi). */
  categoryId: number
  /** Appariements de la catégorie (round-robin de championnat ou de poules). */
  pairings: CategoryPairing[]
}

/** Un match placé sur la grille partagée, ré-associé à sa catégorie. */
export interface PlacedCategoryMatch extends CategoryPairing {
  categoryId: number
  /** Créneau temporel (0-based) sur la grille partagée. */
  slotIndex: number
  /** Terrain du pool partagé (1-based). */
  terrainNumber: number
}

/** Résultat du placement inter-catégories sur le pool partagé. */
export interface MultiCategoryPlacement {
  placed: PlacedCategoryMatch[]
  /** Nombre total de créneaux (repos compris) sur la grille partagée. */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé). */
  restSlots: number
}

/** Clé d'un appariement orienté (domicile → extérieur), unique globalement. */
function pairKey(homeTeamId: number, awayTeamId: number): string {
  return `${homeTeamId}-${awayTeamId}`
}

/**
 * Place les matchs de plusieurs catégories sur un pool de terrains partagé.
 *
 * Garanties (héritées de `placeMatches` + disjonction des équipes) :
 *  - au plus `numTerrains` matchs par créneau, TOUTES catégories confondues
 *    (aucune collision de terrain sur le pool partagé) ;
 *  - au plus 1 match par équipe et par créneau ;
 *  - aucune équipe ne joue deux créneaux consécutifs (par catégorie).
 *
 * @throws SchedulerError paramètres invalides (aucune catégorie, pool < 1, une même
 *         équipe présente dans deux catégories, ou appariement en double).
 */
export function placeMultiCategory(
  categories: CategoryInput[],
  numTerrains: number
): MultiCategoryPlacement {
  if (categories.length === 0) {
    throw new SchedulerError('Aucune catégorie à planifier.')
  }
  if (numTerrains < 1) {
    throw new SchedulerError('Il faut au moins 1 terrain.')
  }

  // Une équipe ne peut appartenir qu'à une seule catégorie (invariant de disjonction
  // sur lequel repose la réutilisation du solveur mono-catégorie).
  const teamOwner = new Map<number, number>()
  const metaByPair = new Map<string, PlacedCategoryMatch>()
  const combined: Pairing[] = []

  for (const cat of categories) {
    for (const p of cat.pairings) {
      for (const teamId of [p.homeTeamId, p.awayTeamId]) {
        const owner = teamOwner.get(teamId)
        if (owner !== undefined && owner !== cat.categoryId) {
          throw new SchedulerError(
            `Une même équipe (#${teamId}) apparaît dans deux catégories : les catégories d'un événement doivent avoir des équipes distinctes.`
          )
        }
        teamOwner.set(teamId, cat.categoryId)
      }

      const key = pairKey(p.homeTeamId, p.awayTeamId)
      if (metaByPair.has(key)) {
        throw new SchedulerError(
          `Appariement en double (#${p.homeTeamId} vs #${p.awayTeamId}) parmi les catégories.`
        )
      }
      metaByPair.set(key, {
        categoryId: cat.categoryId,
        roundNumber: p.roundNumber,
        homeTeamId: p.homeTeamId,
        awayTeamId: p.awayTeamId,
        stage: p.stage,
        groupLabel: p.groupLabel,
        slotIndex: -1,
        terrainNumber: -1,
      })
      combined.push({
        roundNumber: p.roundNumber,
        homeTeamId: p.homeTeamId,
        awayTeamId: p.awayTeamId,
      })
    }
  }

  const { placed, slotsCount, restSlots } = placeMatches(combined, numTerrains)

  const result = placed.map<PlacedCategoryMatch>((m) => {
    const meta = metaByPair.get(pairKey(m.homeTeamId, m.awayTeamId))!
    return { ...meta, slotIndex: m.slotIndex, terrainNumber: m.terrainNumber }
  })

  return { placed: result, slotsCount, restSlots }
}
