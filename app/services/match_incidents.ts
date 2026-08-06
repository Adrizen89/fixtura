/**
 * Aléas du jour J — logique métier pure (aucune dépendance DB), testable
 * unitairement (cf. CLAUDE.md §6, §8, §9 · issue #6).
 *
 * Trois imprévus à gérer sans jamais produire un état invalide :
 *   - décaler un match (nouvelle heure / terrain) ;
 *   - déclarer un forfait — c'est un *statut* de match, jamais une suppression ;
 *   - corriger un score à tout moment.
 *
 * Ce module calcule uniquement les champs résultants ; la persistance,
 * l'historisation (`updated_by_user_id`, `updated_at`) et la diffusion temps
 * réel restent à la charge du contrôleur (contrôleur mince — cf. CLAUDE.md §8).
 */

/**
 * Convention de score d'un forfait (cf. CLAUDE.md §9).
 *
 * Règle retenue en v1 : l'équipe forfaitaire perd **3–0** (victoire par forfait
 * comptée comme une victoire normale au classement : 3 pts, +3 de différence de
 * buts pour l'adversaire). Le match reste comptabilisé (« joué ») : le forfait
 * matérialise un vrai score en base, si bien que le service de classement — pur
 * et sans notion de forfait — l'intègre naturellement comme un résultat 3–0.
 */
export const FORFEIT_WIN_SCORE = 3
export const FORFEIT_LOSS_SCORE = 0

/** Côté d'un match (équipe à domicile ou à l'extérieur). */
export type MatchSide = 'home' | 'away'

/** Champs d'un match une fois son résultat fixé (score saisi ou forfait). */
export interface MatchResultFields {
  homeScore: number
  awayScore: number
  status: 'finished' | 'forfeit'
  forfeitTeamId: number | null
}

/**
 * Champs résultant d'un forfait déclaré du côté `side`.
 * L'équipe forfaitaire encaisse le score perdant, l'adversaire le score gagnant.
 */
export function forfeitFields(
  side: MatchSide,
  homeTeamId: number,
  awayTeamId: number
): MatchResultFields {
  const homeForfeits = side === 'home'
  return {
    homeScore: homeForfeits ? FORFEIT_LOSS_SCORE : FORFEIT_WIN_SCORE,
    awayScore: homeForfeits ? FORFEIT_WIN_SCORE : FORFEIT_LOSS_SCORE,
    status: 'forfeit',
    forfeitTeamId: homeForfeits ? homeTeamId : awayTeamId,
  }
}

/**
 * Champs résultant d'un score saisi ou corrigé.
 * Un score « réel » prime toujours : il termine le match et **annule** tout
 * forfait éventuel (corriger à tout moment — cf. CLAUDE.md §9).
 */
export function scoreFields(homeScore: number, awayScore: number): MatchResultFields {
  return { homeScore, awayScore, status: 'finished', forfeitTeamId: null }
}

/**
 * Déduit de quel côté se trouve l'équipe forfaitaire d'un match, ou `null` si le
 * match n'est pas un forfait. Sert à l'affichage (grille de saisie, écran public).
 */
export function forfeitSideOf(
  status: string,
  forfeitTeamId: number | null,
  homeTeamId: number,
  awayTeamId: number
): MatchSide | null {
  if (status !== 'forfeit' || forfeitTeamId === null) return null
  if (forfeitTeamId === homeTeamId) return 'home'
  if (forfeitTeamId === awayTeamId) return 'away'
  return null
}

/**
 * "HH:mm" → minutes depuis minuit (0..1439). Lève une erreur sur un format
 * invalide (garde-fou : jamais de décalage silencieusement faux — cf. §6).
 */
export function timeToMinutes(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  if (!match) {
    throw new Error(`Heure invalide « ${hhmm} » : format attendu HH:mm.`)
  }
  return Number(match[1]) * 60 + Number(match[2])
}
