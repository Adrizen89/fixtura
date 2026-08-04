import type { Pairing } from './types.js'

const BYE = -1

/**
 * Round-robin simple (méthode du cercle / tables de Berger).
 * Chaque équipe rencontre chaque autre exactement une fois.
 * N pair → N-1 journées ; N impair → N journées avec un « bye » tournant.
 *
 * @param teamIds identifiants d'équipes (supposés uniques, ≥ 2)
 * @returns la liste des appariements, chacun étiqueté par sa journée
 */
export function generateRoundRobin(teamIds: number[]): Pairing[] {
  if (teamIds.length < 2) return []

  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push(BYE)

  const m = teams.length
  const rounds = m - 1
  const half = m / 2
  const pairings: Pairing[] = []

  // arr[0] reste fixe, les autres tournent d'un cran à chaque journée.
  const arr = [...teams]
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[m - 1 - i]
      if (a === BYE || b === BYE) continue

      // Alternance domicile/extérieur pour équilibrer sur l'ensemble.
      const home = r % 2 === 0 ? a : b
      const away = r % 2 === 0 ? b : a
      pairings.push({ roundNumber: r + 1, homeTeamId: home, awayTeamId: away })
    }

    // Rotation : garder arr[0], décaler le reste vers la droite.
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as number)
    arr.splice(1, arr.length - 1, ...rest)
  }

  return pairings
}
