import { SchedulerError } from './errors.js'
import { nextPowerOfTwo, seedPositions } from './seeding.js'
import type {
  SlotSource,
  BracketMatch,
  DoubleElimination,
  DoubleEliminationParams,
} from './types.js'

/**
 * Moteur de **double élimination** (issue #111) — TypeScript pur, aucune dépendance
 * DB, testable unitairement (cf. CLAUDE.md §6).
 *
 * Structure produite, à participants **différés** (sources alignées sur `matches.*`
 * de #42, comme l'élimination directe) :
 *  - **Tableau principal** (winners) : un arbre d'élimination directe classique. Le
 *    **perdant** de chaque match y « descend » vers le repêchage (`match_loser`).
 *  - **Repêchage** (losers) : alterne des tours *mineurs* (les rescapés du repêchage
 *    se rencontrent) et *majeurs* (un rescapé affronte un perdant fraîchement
 *    descendu du tableau principal). Une équipe n'est éliminée qu'à sa **2ᵉ défaite**.
 *  - **Grande finale** : vainqueur du tableau principal vs vainqueur du repêchage, en
 *    **un seul match** (pas de « bracket reset » en v1 — évolution possible, cf. #111).
 *
 * Faisabilité garantie ou erreur explicite (CLAUDE.md §6) : la construction réussit
 * pour tout ensemble d'au moins 2 qualifiés ; les byes (nombre de qualifiés non
 * puissance de 2) sont attribués aux têtes de série et se propagent proprement, dans
 * le tableau principal comme dans le repêchage (aucun match muet).
 *
 * Le placement horaire (créneaux × terrains) et la persistance ne sont **pas** du
 * ressort de ce module : il rend une liste de `BracketMatch` avec leurs bandes
 * topologiques, prête pour `placeBracketOntoGrid` (intégration ultérieure).
 *
 * @throws SchedulerError entrées invalides (< 2 qualifiés, doublon d'équipe).
 */
export function buildDoubleElimination(params: DoubleEliminationParams): DoubleElimination {
  const { entrants } = params

  if (entrants.length < 2) {
    throw new SchedulerError('Il faut au moins 2 qualifiés pour une double élimination.')
  }
  const teamIds = entrants.flatMap((e) => (e.type === 'team' ? [e.teamId] : []))
  if (new Set(teamIds).size !== teamIds.length) {
    throw new SchedulerError('Une même équipe apparaît deux fois parmi les qualifiés.')
  }

  const size = nextPowerOfTwo(entrants.length)
  const winnersRounds = Math.round(Math.log2(size))
  const byes = size - entrants.length

  const matches: BracketMatch[] = []

  // --- Tableau principal (winners) ---------------------------------------------
  // Position de départ : tête de série s (1..N) → entrants[s-1] ; s > N → bye (null).
  let cur: (SlotSource | null)[] = seedPositions(size).map((seed) =>
    seed <= entrants.length ? entrants[seed - 1] : null
  )
  // Perdants de chaque tour du tableau principal (dans l'ordre des positions ;
  // null pour un bye, qui ne descend personne au repêchage).
  const winnersLosers: (SlotSource | null)[][] = []

  for (let round = 1; round <= winnersRounds; round++) {
    const code = `wb-r${round}`
    const label =
      round === winnersRounds ? 'Finale du tableau principal' : `Tableau principal — tour ${round}`
    const next: (SlotSource | null)[] = []
    const losers: (SlotSource | null)[] = []
    let slot = 0

    for (let i = 0; i < cur.length; i += 2) {
      const a = cur[i]
      const b = i + 1 < cur.length ? cur[i + 1] : null
      if (a === null && b === null) {
        next.push(null)
        losers.push(null)
        continue
      }
      if (a === null || b === null) {
        // Bye : l'exempté avance sans jouer ; aucun perdant ne descend.
        next.push(a ?? b)
        losers.push(null)
        continue
      }
      const id = `${code}-${slot + 1}`
      matches.push({
        id,
        round,
        bracketRound: code,
        label,
        slot,
        band: 0,
        home: a,
        away: b,
        bracket: 'winners',
      })
      next.push({ type: 'match_winner', matchId: id })
      losers.push({ type: 'match_loser', matchId: id })
      slot++
    }

    winnersLosers.push(losers)
    cur = next
  }
  const winnersChampion = cur[0]! // vainqueur de la finale du tableau principal

  // --- Repêchage (losers) ------------------------------------------------------
  let losersRound = 0

  /** Tour mineur : les rescapés du repêchage se rencontrent (appariés 2 à 2). */
  const minorRound = (sources: (SlotSource | null)[]): (SlotSource | null)[] => {
    losersRound++
    const code = `lb-r${losersRound}`
    const label = `Repêchage — tour ${losersRound}`
    const next: (SlotSource | null)[] = []
    let slot = 0
    for (let i = 0; i < sources.length; i += 2) {
      const a = sources[i]
      const b = i + 1 < sources.length ? sources[i + 1] : null
      if (a === null && b === null) {
        next.push(null)
        continue
      }
      if (a === null || b === null) {
        next.push(a ?? b)
        continue
      }
      const id = `${code}-${slot + 1}`
      matches.push({
        id,
        round: losersRound,
        bracketRound: code,
        label,
        slot,
        band: 0,
        home: a,
        away: b,
        bracket: 'losers',
      })
      next.push({ type: 'match_winner', matchId: id })
      slot++
    }
    return next
  }

  /** Tour majeur : chaque rescapé du repêchage affronte un perdant descendu (même indice). */
  const majorRound = (
    survivors: (SlotSource | null)[],
    dropped: (SlotSource | null)[],
    isFinal: boolean
  ): (SlotSource | null)[] => {
    losersRound++
    const code = `lb-r${losersRound}`
    const label = isFinal ? 'Finale du repêchage' : `Repêchage — tour ${losersRound}`
    const next: (SlotSource | null)[] = []
    let slot = 0
    for (const [i, a] of survivors.entries()) {
      const b = i < dropped.length ? dropped[i] : null
      if (a === null && b === null) {
        next.push(null)
        continue
      }
      if (a === null || b === null) {
        next.push(a ?? b)
        continue
      }
      const id = `${code}-${slot + 1}`
      matches.push({
        id,
        round: losersRound,
        bracketRound: code,
        label,
        slot,
        band: 0,
        home: a,
        away: b,
        bracket: 'losers',
      })
      next.push({ type: 'match_winner', matchId: id })
      slot++
    }
    return next
  }

  let losersCur: (SlotSource | null)[]
  if (winnersRounds === 1) {
    // 2 qualifiés : pas de repêchage. Le perdant de l'unique match principal est
    // directement « champion du repêchage » et rejoint la grande finale.
    losersCur = winnersLosers[0]
  } else {
    // Tour 1 (mineur) : les perdants du 1er tour du tableau principal se rencontrent.
    losersCur = minorRound(winnersLosers[0])
    // Puis, pour chaque tour suivant du tableau principal : un tour majeur qui accueille
    // ses perdants, suivi (sauf au dernier) d'un tour mineur de consolidation.
    for (let k = 2; k <= winnersRounds; k++) {
      losersCur = majorRound(losersCur, winnersLosers[k - 1], k === winnersRounds)
      if (k < winnersRounds) {
        losersCur = minorRound(losersCur)
      }
    }
  }
  const losersChampion = losersCur[0]! // vainqueur de la finale du repêchage

  // --- Grande finale : champion du tableau principal vs champion du repêchage ---
  matches.push({
    id: 'gf-1',
    round: winnersRounds + 1,
    bracketRound: 'gf',
    label: 'Grande finale',
    slot: 0,
    band: 0,
    home: winnersChampion,
    away: losersChampion,
    bracket: 'grand_final',
  })

  // --- Banding topologique : band = 1 + max(band des nourriciers) --------------
  // Ordre de création = ordre de dépendance (principal → repêchage → grande finale),
  // donc un nourricier précède toujours son consommateur → une seule passe suffit.
  const byId = new Map(matches.map((m) => [m.id, m]))
  let bands = 0
  for (const m of matches) {
    let feederBand = 0
    for (const src of [m.home, m.away]) {
      if (src.type === 'match_winner' || src.type === 'match_loser') {
        feederBand = Math.max(feederBand, byId.get(src.matchId)?.band ?? 0)
      }
    }
    m.band = feederBand + 1
    bands = Math.max(bands, m.band)
  }

  return { matches, size, winnersRounds, losersRounds: losersRound, byes, bands }
}
