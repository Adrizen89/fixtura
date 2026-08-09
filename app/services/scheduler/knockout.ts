import { SchedulerError, InfeasibleScheduleError } from './errors.js'
import { nextPowerOfTwo, seedPositions } from './seeding.js'
import type { SlotSource, BracketMatch, Bracket, KnockoutParams } from './types.js'

/** Code de tour aligné sur `matches.bracket_round`, d'après la distance à la finale. */
function roundCode(round: number, rounds: number): string {
  const distance = rounds - round
  switch (distance) {
    case 0:
      return 'final'
    case 1:
      return 'sf'
    case 2:
      return 'qf'
    default:
      // Nombre d'équipes dans ce tour : 2^(distance+1) → r16, r32, r64…
      return `r${2 ** (distance + 1)}`
  }
}

/** Libellé FR d'un tour, d'après la distance à la finale. */
function roundLabel(round: number, rounds: number): string {
  const distance = rounds - round
  switch (distance) {
    case 0:
      return 'Finale'
    case 1:
      return 'Demi-finales'
    case 2:
      return 'Quarts de finale'
    case 3:
      return 'Huitièmes de finale'
    case 4:
      return 'Seizièmes de finale'
    case 5:
      return 'Trente-deuxièmes de finale'
    default:
      return `Tour ${round}`
  }
}

/**
 * Construit un arbre d'élimination directe à participants différés.
 *
 * Étapes :
 *  1. Taille de bracket = prochaine puissance de 2 ≥ nombre de qualifiés ; les
 *     `byes` comblent l'écart et sont attribués aux têtes de série (grâce au
 *     placement standard des positions : les meilleures têtes sont appariées aux
 *     positions fantômes).
 *  2. Chaque tour apparie les slots deux à deux. Un bye ne crée pas de match
 *     (l'exempté avance, sa source se propage) ; un vrai duel crée un
 *     `BracketMatch` dont le vainqueur alimente le tour suivant (`match_winner`).
 *  3. Petite finale optionnelle : perdants des deux demi-finales (`match_loser`).
 *  4. Banding topologique : chaque match reçoit une bande = 1 + max des bandes de
 *     ses matchs nourriciers, garantissant qu'un tour est ordonnançable seulement
 *     après la fin de ses nourriciers (jamais de dépendance non satisfaite).
 *
 * Faisabilité garantie ou erreur explicite (CLAUDE.md §6) : la construction
 * réussit pour tout ensemble d'au moins 2 qualifiés ; la seule impossibilité est
 * une petite finale demandée sans deux demi-finales réellement disputées.
 *
 * @throws SchedulerError entrées invalides (< 2 qualifiés, doublon d'équipe).
 * @throws InfeasibleScheduleError petite finale demandée mais impossible.
 */
export function buildKnockout(params: KnockoutParams): Bracket {
  const { entrants } = params
  const wantThird = params.thirdPlace ?? false

  if (entrants.length < 2) {
    throw new SchedulerError(
      "Il faut au moins 2 qualifiés pour construire un arbre d'élimination directe."
    )
  }
  const teamIds = entrants.flatMap((e) => (e.type === 'team' ? [e.teamId] : []))
  if (new Set(teamIds).size !== teamIds.length) {
    throw new SchedulerError('Une même équipe apparaît deux fois parmi les qualifiés.')
  }

  const size = nextPowerOfTwo(entrants.length)
  const rounds = Math.round(Math.log2(size))
  const byes = size - entrants.length

  // Position de départ : tête de série s (1..K) → entrants[s-1] ; s > K → bye (null).
  let sources: (SlotSource | null)[] = seedPositions(size).map((seed) =>
    seed <= entrants.length ? entrants[seed - 1] : null
  )

  const matches: BracketMatch[] = []

  for (let round = 1; round <= rounds; round++) {
    const code = roundCode(round, rounds)
    const label = roundLabel(round, rounds)
    const next: (SlotSource | null)[] = []
    let slot = 0

    for (let i = 0; i < sources.length; i += 2) {
      const a = sources[i]
      const b = sources[i + 1]

      if (a === null && b === null) {
        // Ne peut pas survenir : les byes n'occupent que des positions isolées
        // (byes < moitié du bracket). Garde-fou pour ne jamais produire d'arbre muet.
        throw new InfeasibleScheduleError(
          'Incohérence interne du bracket : deux byes appariés (entrées invalides).'
        )
      }
      if (a === null || b === null) {
        // Bye : l'exempté avance sans jouer, sa source se propage telle quelle.
        next.push(a ?? b)
        continue
      }

      const id = `${code}-${slot + 1}`
      matches.push({ id, round, bracketRound: code, label, slot, band: 0, home: a, away: b })
      next.push({ type: 'match_winner', matchId: id })
      slot++
    }

    sources = next
  }

  // --- Petite finale (3e place) : perdants des deux demi-finales ---
  if (wantThird) {
    const final = matches.find((m) => m.bracketRound === 'final')
    if (!final || final.home.type !== 'match_winner' || final.away.type !== 'match_winner') {
      throw new InfeasibleScheduleError(
        'Petite finale impossible avec ces qualifiés : il faut deux demi-finales ' +
          'réellement disputées (au moins 4 qualifiés, sans bye en demi-finale).'
      )
    }
    matches.push({
      id: 'third-1',
      round: rounds,
      bracketRound: 'third',
      label: 'Petite finale',
      slot: 0,
      band: 0,
      home: { type: 'match_loser', matchId: final.home.matchId },
      away: { type: 'match_loser', matchId: final.away.matchId },
      thirdPlace: true,
    })
  }

  // --- Banding topologique : band = 1 + max(band des nourriciers) ---
  // Les nourriciers (match_winner/match_loser) sont toujours des tours antérieurs,
  // donc déjà présents plus tôt dans `matches` → une seule passe suffit.
  const byId = new Map(matches.map((m) => [m.id, m]))
  let maxBand = 0
  for (const m of matches) {
    let feederBand = 0
    for (const src of [m.home, m.away]) {
      if (src.type === 'match_winner' || src.type === 'match_loser') {
        feederBand = Math.max(feederBand, byId.get(src.matchId)!.band)
      }
    }
    m.band = feederBand + 1
    maxBand = Math.max(maxBand, m.band)
  }

  return { matches, size, rounds, byes, bands: maxBand }
}
