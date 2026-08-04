import type { Pairing } from './types.js'
import { InfeasibleScheduleError } from './errors.js'

export interface PlacedMatch {
  roundNumber: number
  slotIndex: number
  terrainNumber: number
  homeTeamId: number
  awayTeamId: number
}

export interface PlacementResult {
  placed: PlacedMatch[]
  /** Nombre total de créneaux (repos compris). */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé). */
  restSlots: number
}

/**
 * Place les appariements sur des créneaux × terrains (glouton, plus remplissant
 * d'abord). Contraintes dures garanties :
 *  - au plus 1 match par équipe et par créneau (jamais en parallèle) ;
 *  - aucune équipe ne joue deux créneaux consécutifs (repos obligatoire) ;
 *  - au plus `numTerrains` matchs par créneau.
 *
 * Méthode constructive : à chaque créneau on retient un ensemble d'équipes
 * disjointes non bloquées par le créneau précédent. Si tous les matchs restants
 * sont bloqués, on insère un créneau de repos (vide) qui libère tout le monde au
 * suivant. Comme chaque créneau non vide place ≥ 1 match et qu'on n'a jamais deux
 * créneaux vides consécutifs, la terminaison et la faisabilité sont garanties
 * pour tout N ≥ 2 et numTerrains ≥ 1.
 */
export function placeMatches(pairings: Pairing[], numTerrains: number): PlacementResult {
  const remaining: Pairing[] = pairings.map((p) => ({ ...p }))
  const placed: PlacedMatch[] = []

  let slotIndex = 0
  let restSlots = 0
  let prevSlotTeams = new Set<number>()

  // Borne de sûreté : au pire 1 match/créneau + 1 repos entre chaque.
  const maxSlots = pairings.length * 2 + 2

  while (remaining.length > 0) {
    if (slotIndex > maxSlots) {
      throw new InfeasibleScheduleError(
        'Impossible de générer un planning respectant les contraintes avec ces paramètres. ' +
          'Augmentez le nombre de terrains ou réduisez les pauses.'
      )
    }

    // Heuristique : traiter d'abord les matchs impliquant les équipes ayant le
    // plus de matchs restants (les plus « contraintes »).
    const degree = new Map<number, number>()
    for (const g of remaining) {
      degree.set(g.homeTeamId, (degree.get(g.homeTeamId) ?? 0) + 1)
      degree.set(g.awayTeamId, (degree.get(g.awayTeamId) ?? 0) + 1)
    }
    const order = [...remaining].sort((a, b) => {
      const da = (degree.get(a.homeTeamId) ?? 0) + (degree.get(a.awayTeamId) ?? 0)
      const db = (degree.get(b.homeTeamId) ?? 0) + (degree.get(b.awayTeamId) ?? 0)
      return db - da
    })

    const usedThisSlot = new Set<number>()
    const slotMatches: Pairing[] = []

    for (const g of order) {
      if (slotMatches.length >= numTerrains) break
      if (prevSlotTeams.has(g.homeTeamId) || prevSlotTeams.has(g.awayTeamId)) continue
      if (usedThisSlot.has(g.homeTeamId) || usedThisSlot.has(g.awayTeamId)) continue
      slotMatches.push(g)
      usedThisSlot.add(g.homeTeamId)
      usedThisSlot.add(g.awayTeamId)
    }

    if (slotMatches.length === 0) {
      // Tous les matchs restants sont bloqués par le repos → créneau vide.
      restSlots++
      slotIndex++
      prevSlotTeams = new Set()
      continue
    }

    slotMatches.forEach((g, idx) => {
      placed.push({
        roundNumber: g.roundNumber,
        slotIndex,
        terrainNumber: idx + 1,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
      })
      const i = remaining.indexOf(g)
      if (i >= 0) remaining.splice(i, 1)
    })

    prevSlotTeams = usedThisSlot
    slotIndex++
  }

  return { placed, slotsCount: slotIndex, restSlots }
}
