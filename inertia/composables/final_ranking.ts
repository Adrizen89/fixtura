/**
 * Classement final (podium) d'un tableau à élimination directe — issue #106.
 *
 * Logique pure (aucune dépendance Vue/DOM), dérivée des matchs déjà connus :
 *   - 1er / 2e ← vainqueur / perdant de la **finale** ;
 *   - 3e / 4e ← vainqueur / perdant de la **petite finale** (3ᵉ place), si elle existe.
 *
 * Le vainqueur d'un match est déterminé au score, ou aux **tirs au but** en cas de
 * nul (élimination, issue #105). Le podium n'apparaît qu'une fois la **finale jouée**
 * (sinon vide) ; la petite finale complète les rangs 3/4 quand elle est réglée.
 * Typage structurel → testable et découplé de `ResultMatchRow`.
 */

/** Un match, réduit aux champs nécessaires au classement final. */
export interface FinalMatch {
  bracketRound: string | null
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string
  shootoutWinnerSide: 'home' | 'away' | null
}

/** Une ligne du classement final. */
export interface RankedTeam {
  rank: number
  teamName: string
}

/** Vainqueur / perdant d'un match réglé (score ou t.a.b.), ou null si indécis. */
function decidedWinner(m: FinalMatch): { winner: string; loser: string } | null {
  const settled = m.status === 'finished' || m.status === 'forfeit'
  if (!settled || m.homeScore === null || m.awayScore === null) return null
  if (m.homeScore > m.awayScore) return { winner: m.homeTeam, loser: m.awayTeam }
  if (m.awayScore > m.homeScore) return { winner: m.awayTeam, loser: m.homeTeam }
  // Nul départagé aux tirs au but (issue #105).
  if (m.shootoutWinnerSide === 'home') return { winner: m.homeTeam, loser: m.awayTeam }
  if (m.shootoutWinnerSide === 'away') return { winner: m.awayTeam, loser: m.homeTeam }
  return null
}

/** Finale du repêchage (double élimination) = le tour `lb-r*` le plus élevé. */
function losersFinal(matches: FinalMatch[]): FinalMatch | null {
  let best: FinalMatch | null = null
  let bestRound = -1
  for (const m of matches) {
    const lb = /^lb-r(\d+)$/.exec(m.bracketRound ?? '')
    if (lb && Number(lb[1]) > bestRound) {
      bestRound = Number(lb[1])
      best = m
    }
  }
  return best
}

/**
 * Classement final d'un tableau : renvoie les rangs **déterminés**. Vide tant que le
 * match décisif n'est pas joué.
 *
 * - Élimination directe / hybride : 1er/2e ← finale (`final`) ; 3e/4e ← petite
 *   finale (`third`) si réglée.
 * - Double élimination : 1er/2e ← grande finale (`gf`) ; 3e ← perdant de la finale
 *   du repêchage (dernier tour `lb-r*`), si réglée.
 */
export function finalRanking(matches: FinalMatch[]): RankedTeam[] {
  const decider =
    matches.find((m) => m.bracketRound === 'gf') ?? matches.find((m) => m.bracketRound === 'final')
  const finalOutcome = decider ? decidedWinner(decider) : null
  if (!decider || !finalOutcome) return []

  const ranking: RankedTeam[] = [
    { rank: 1, teamName: finalOutcome.winner },
    { rank: 2, teamName: finalOutcome.loser },
  ]

  // Double élimination : 3e = perdant de la finale du repêchage.
  if (decider.bracketRound === 'gf') {
    const lbFinalOutcome = decidedWinnerOrNull(losersFinal(matches))
    if (lbFinalOutcome) ranking.push({ rank: 3, teamName: lbFinalOutcome.loser })
    return ranking
  }

  // Élimination directe / hybride : 3e/4e via la petite finale.
  const third = matches.find((m) => m.bracketRound === 'third')
  const thirdOutcome = third ? decidedWinner(third) : null
  if (thirdOutcome) {
    ranking.push({ rank: 3, teamName: thirdOutcome.winner })
    ranking.push({ rank: 4, teamName: thirdOutcome.loser })
  }

  return ranking
}

/** `decidedWinner` tolérant à un match absent (null). */
function decidedWinnerOrNull(m: FinalMatch | null): { winner: string; loser: string } | null {
  return m ? decidedWinner(m) : null
}

/** Suffixe ordinal français court : 1 → « 1er », n → « ne ». */
export function ordinalFr(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`
}
