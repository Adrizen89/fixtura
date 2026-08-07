import { InfeasibleScheduleError, SchedulerError } from './errors.js'

/**
 * Solveur de placement **unifié** pour la grille partagée d'un événement
 * multi-catégories (#32) — moteur **pur**, aucune dépendance DB.
 *
 * Place **n'importe quel mélange** de catégories — championnat / poules
 * (round-robin) **et élimination directe** (bracket, participants différés) — sur un
 * pool de terrains commun, sans collision de créneau. Chaque match est décrit comme
 * une **unité** portant deux types de contraintes :
 *
 *  - `blockingTeams` : équipes **concrètes** impliquées (round-robin, ou 1er tour
 *    d'un bracket). Elles ne jouent jamais deux créneaux consécutifs (repos) ni
 *    deux matchs sur le même créneau. Vide quand le participant est différé.
 *  - `predecessors` : unités **nourricières** (bracket) qui doivent être placées
 *    sur un créneau **strictement antérieur** (« le vainqueur de X » ne peut jouer
 *    avant que X soit joué). Les catégories round-robin n'en ont aucune.
 *
 * Placement glouton créneau par créneau : à chaque créneau on retient un ensemble
 * d'unités **prêtes** (nourriciers déjà placés sur un créneau antérieur), aux
 * équipes disjointes, non bloquées par le repos, dans la limite de `numTerrains`.
 * Les unités les plus **contraintes** (fort degré d'équipes restantes) passent en
 * premier ; les matchs à participants différés (bracket) comblent les terrains
 * restants. Si toutes les unités prêtes sont bloquées par le repos, on insère un
 * créneau vide qui libère tout le monde au suivant.
 *
 * Terminaison & faisabilité garanties : l'unité restante de plus faible « niveau »
 * (nourriciers déjà placés) est toujours prête ; un bracket étant un DAG, il en
 * existe toujours une → chaque créneau non vide place ≥ 1 unité, sans deux créneaux
 * vides consécutifs.
 */

/** Une unité (un match) à placer sur la grille partagée. */
export interface EventGridUnit {
  categoryId: number
  /** Identifiant unique de l'unité sur la grille (namespacé par catégorie). */
  key: string
  /** Équipes concrètes bloquantes (repos + unicité par créneau) ; vide si différé. */
  blockingTeams: number[]
  /** Clés des unités nourricières à placer sur un créneau strictement antérieur. */
  predecessors: string[]
}

/** Une unité placée sur la grille partagée. */
export interface PlacedEventGridUnit {
  key: string
  categoryId: number
  slotIndex: number
  terrainNumber: number
}

export interface EventGridPlacement {
  placed: PlacedEventGridUnit[]
  /** Nombre total de créneaux (repos compris). */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé). */
  restSlots: number
}

/**
 * Place un ensemble d'unités sur le pool de terrains partagé.
 *
 * @throws SchedulerError paramètres invalides (aucune unité, pool < 1, clé en
 *         double, nourricier inconnu, une équipe partagée entre deux catégories).
 * @throws InfeasibleScheduleError garde-fou de non-terminaison (ne devrait pas
 *         survenir pour des entrées valides).
 */
export function placeEventGrid(units: EventGridUnit[], numTerrains: number): EventGridPlacement {
  if (units.length === 0) {
    throw new SchedulerError('Aucun match à planifier.')
  }
  if (numTerrains < 1) {
    throw new SchedulerError('Il faut au moins 1 terrain.')
  }

  const byKey = new Map<string, EventGridUnit>()
  const teamOwner = new Map<number, number>()
  for (const u of units) {
    if (byKey.has(u.key)) {
      throw new SchedulerError(`Unité de planning en double : « ${u.key} ».`)
    }
    byKey.set(u.key, u)
    for (const teamId of u.blockingTeams) {
      const owner = teamOwner.get(teamId)
      if (owner !== undefined && owner !== u.categoryId) {
        throw new SchedulerError(
          `Une même équipe (#${teamId}) apparaît dans deux catégories : les catégories d'un événement doivent avoir des équipes distinctes.`
        )
      }
      teamOwner.set(teamId, u.categoryId)
    }
  }
  for (const u of units) {
    for (const p of u.predecessors) {
      if (!byKey.has(p)) {
        throw new SchedulerError(`Nourricier inconnu « ${p} » pour l'unité « ${u.key} ».`)
      }
    }
  }

  const placedKeys = new Set<string>()
  const placed: PlacedEventGridUnit[] = []
  const remaining = new Set(units.map((u) => u.key))

  let slotIndex = 0
  let restSlots = 0
  let prevSlotTeams = new Set<number>()

  // Borne de sûreté : au pire 1 match/créneau + 1 repos intercalé.
  const maxSlots = units.length * 2 + 2

  while (remaining.size > 0) {
    if (slotIndex > maxSlots) {
      throw new InfeasibleScheduleError(
        'Impossible de générer un planning respectant les contraintes avec ces paramètres. ' +
          'Augmentez le nombre de terrains ou réduisez les pauses.'
      )
    }

    // Unités prêtes : tous les nourriciers déjà placés (sur un créneau antérieur).
    const ready: EventGridUnit[] = []
    for (const key of remaining) {
      const u = byKey.get(key)!
      if (u.predecessors.every((p) => placedKeys.has(p))) ready.push(u)
    }

    // Heuristique : d'abord les unités impliquant les équipes ayant le plus de
    // matchs restants (les plus contraintes) ; les matchs à participants différés
    // (sans équipe bloquante) comblent les terrains restants.
    const degree = new Map<number, number>()
    for (const key of remaining) {
      for (const teamId of byKey.get(key)!.blockingTeams) {
        degree.set(teamId, (degree.get(teamId) ?? 0) + 1)
      }
    }
    const weightOf = (u: EventGridUnit) =>
      u.blockingTeams.reduce((sum, t) => sum + (degree.get(t) ?? 0), 0)
    ready.sort((a, b) => weightOf(b) - weightOf(a) || (a.key < b.key ? -1 : 1))

    const usedThisSlot = new Set<number>()
    const slotUnits: EventGridUnit[] = []
    for (const u of ready) {
      if (slotUnits.length >= numTerrains) break
      if (u.blockingTeams.some((t) => prevSlotTeams.has(t))) continue // repos
      if (u.blockingTeams.some((t) => usedThisSlot.has(t))) continue // pas deux fois/créneau
      slotUnits.push(u)
      for (const t of u.blockingTeams) usedThisSlot.add(t)
    }

    if (slotUnits.length === 0) {
      // Toutes les unités prêtes sont bloquées par le repos → créneau vide.
      restSlots++
      slotIndex++
      prevSlotTeams = new Set()
      continue
    }

    slotUnits.forEach((u, idx) => {
      placed.push({
        key: u.key,
        categoryId: u.categoryId,
        slotIndex,
        terrainNumber: idx + 1,
      })
      remaining.delete(u.key)
    })
    // On ne marque « placé » qu'à la fin du créneau : un nourricier placé ICI ne
    // rend pas son enfant éligible avant le créneau suivant (ordre strict garanti).
    for (const u of slotUnits) placedKeys.add(u.key)

    prevSlotTeams = usedThisSlot
    slotIndex++
  }

  return { placed, slotsCount: slotIndex, restSlots }
}
