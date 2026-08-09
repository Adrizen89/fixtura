import type Match from '#models/match'

/**
 * Libellés d'affichage d'un participant de match — équipe connue ou source
 * **différée** (bracket / hybride). Partagé entre l'aperçu planning et l'écran
 * résultats/public afin de nommer un slot non encore résolu sans jamais
 * déréférencer une relation d'équipe absente (cf. #45 / #47).
 */

/** Libellé court d'un tour de bracket (élimination directe et double élimination). */
export function bracketRoundShort(code: string | null): string {
  switch (code) {
    case 'final':
      return 'Finale'
    case 'sf':
      return 'Demie'
    case 'qf':
      return 'Quart'
    case 'third':
      return 'Petite finale'
    case 'r16':
      return '8e'
    case 'r32':
      return '16e'
    case 'gf':
      return 'Grande finale'
  }
  // Double élimination : tableau principal `wb-r{n}` / repêchage `lb-r{n}`.
  const wb = /^wb-r(\d+)$/.exec(code ?? '')
  if (wb) return `Principal T${wb[1]}`
  const lb = /^lb-r(\d+)$/.exec(code ?? '')
  if (lb) return `Repêchage T${lb[1]}`
  return code ?? 'Tour'
}

/** « 1er Poule A », « 2e Poule B ». */
export function poolRankLabel(pool: string | null, rank: number | null): string {
  const r = rank === 1 ? '1er' : `${rank ?? '?'}e`
  return `${r} Poule ${pool ?? '?'}`
}

/** Étiquette d'un match de bracket (« Quart #1 »), pour référencer un slot différé. */
function matchTag(m: { bracketRound: string | null; bracketSlot: number | null }): string {
  return `${bracketRoundShort(m.bracketRound)} #${(m.bracketSlot ?? 0) + 1}`
}

/**
 * Nom du participant d'un côté (`home` / `away`) d'un match : l'équipe si connue
 * (relation préchargée), sinon un libellé lisible de sa source différée
 * (« Vainqueur Quart #1 », « 1er Poule A », « À définir »). Ne déréférence jamais
 * une équipe absente. `byId` mappe id → match (pour résoudre les sources amont).
 */
export function participantLabel(
  m: Match,
  side: 'home' | 'away',
  byId: Map<number, Match>
): string {
  const teamId = side === 'home' ? m.homeTeamId : m.awayTeamId
  const team = side === 'home' ? m.homeTeam : m.awayTeam
  if (teamId !== null && team) return team.name

  const type = side === 'home' ? m.homeSourceType : m.awaySourceType
  const matchId = side === 'home' ? m.homeSourceMatchId : m.awaySourceMatchId
  const pool = side === 'home' ? m.homeSourcePool : m.awaySourcePool
  const rank = side === 'home' ? m.homeSourceRank : m.awaySourceRank

  if (type === 'match_winner' || type === 'match_loser') {
    const ref = matchId !== null ? byId.get(matchId) : undefined
    const who = type === 'match_winner' ? 'Vainqueur' : 'Perdant'
    return `${who} ${ref ? matchTag(ref) : '?'}`
  }
  if (type === 'pool_rank') return poolRankLabel(pool, rank)
  return 'À définir'
}
