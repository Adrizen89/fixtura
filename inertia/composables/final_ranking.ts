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

/**
 * Classement final d'un tableau : renvoie les rangs **déterminés**. Vide tant que la
 * finale n'est pas jouée ; 1er/2e dès la finale réglée ; 3e/4e en plus si la petite
 * finale est réglée.
 */
export function finalRanking(matches: FinalMatch[]): RankedTeam[] {
  const final = matches.find((m) => m.bracketRound === 'final')
  const finalOutcome = final ? decidedWinner(final) : null
  if (!finalOutcome) return []

  const ranking: RankedTeam[] = [
    { rank: 1, teamName: finalOutcome.winner },
    { rank: 2, teamName: finalOutcome.loser },
  ]

  const third = matches.find((m) => m.bracketRound === 'third')
  const thirdOutcome = third ? decidedWinner(third) : null
  if (thirdOutcome) {
    ranking.push({ rank: 3, teamName: thirdOutcome.winner })
    ranking.push({ rank: 4, teamName: thirdOutcome.loser })
  }

  return ranking
}

/** Suffixe ordinal français court : 1 → « 1er », n → « ne ». */
export function ordinalFr(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`
}
