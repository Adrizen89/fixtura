/**
 * Système suisse — moteur d'appariement **pur** (issue #110), sans aucune dépendance
 * DB, testable unitairement (cf. CLAUDE.md §6).
 *
 * Principe : à chaque ronde, on apparie les équipes par **proximité de classement**
 * (les équipes à score voisin se rencontrent), **sans réédition** d'un match déjà
 * joué, et avec un **bye** (exempt) tournant si le nombre d'équipes est impair.
 *
 * Contrairement au round-robin ou au bracket, les appariements d'une ronde ne sont
 * connus qu'**après** les résultats de la précédente : ce module ne calcule donc
 * qu'**une** ronde à la fois, à partir de l'ordre de classement courant. La couche
 * DB (`app/services/swiss.ts`) l'appelle ronde après ronde.
 */

/** Un appariement (les deux équipes sont connues ; le bye est porté à part). */
export interface SwissPairing {
  homeTeamId: number
  awayTeamId: number
}

/** Résultat d'une ronde : les duels + l'éventuelle équipe exemptée. */
export interface SwissRound {
  pairings: SwissPairing[]
  byeTeamId: number | null
}

/**
 * Nombre de rondes standard d'un tournoi suisse : ⌈log₂(N)⌉ (assez pour départager
 * un vainqueur net), borné à `[1, N-1]` (jamais plus qu'un round-robin complet).
 */
export function defaultSwissRounds(numTeams: number): number {
  if (numTeams < 2) return 0
  const rounds = Math.ceil(Math.log2(numTeams))
  return Math.max(1, Math.min(rounds, numTeams - 1))
}

/** Clé non ordonnée d'une paire, pour détecter les rééditions de match. */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/**
 * Apparie **une** ronde du système suisse.
 *
 * @param ordered Équipes triées « meilleure d'abord » selon le classement courant.
 *                À la ronde 1 (aucun résultat), c'est l'ordre de tête de série
 *                (ordre d'ajout des équipes).
 * @param played  Paires déjà jouées (clés `pairKey`) — pour éviter les rematchs.
 * @param byed    Équipes ayant déjà été exemptées — le bye tourne vers d'autres.
 * @returns Les duels de la ronde + l'équipe exemptée (ou `null` si N pair).
 *
 * Le bye va à l'équipe la **moins bien classée** n'ayant pas encore été exemptée
 * (équité). L'appariement du reste se fait par backtracking pour **garantir**
 * l'absence de rematch quand c'est possible ; s'il n'existe aucune configuration
 * sans rematch (petit N, beaucoup de rondes), on relâche la contrainte en dernier
 * recours plutôt que d'échouer.
 */
export function pairSwissRound(
  ordered: number[],
  played: ReadonlySet<string>,
  byed: ReadonlySet<number>
): SwissRound {
  const pool = [...ordered]
  let byeTeamId: number | null = null

  if (pool.length % 2 === 1) {
    // Bye : la moins bien classée pas encore exemptée (sinon, à défaut, la dernière).
    let idx = pool.length - 1
    for (let i = pool.length - 1; i >= 0; i--) {
      if (!byed.has(pool[i])) {
        idx = i
        break
      }
    }
    byeTeamId = pool[idx]
    pool.splice(idx, 1)
  }

  const pairings = pairPool(pool, played) ?? pairPool(pool, new Set<string>()) ?? []
  return { pairings, byeTeamId }
}

/**
 * Apparie récursivement un pool de taille paire en évitant les rééditions.
 * L'équipe de tête est associée au plus proche partenaire disponible (proximité de
 * classement), puis on récurse ; en cas d'impasse on revient en arrière
 * (backtracking). Retourne `null` si aucun appariement sans rematch n'existe.
 */
function pairPool(pool: number[], played: ReadonlySet<string>): SwissPairing[] | null {
  if (pool.length === 0) return []

  const [head, ...rest] = pool
  for (let i = 0; i < rest.length; i++) {
    const candidate = rest[i]
    if (played.has(pairKey(head, candidate))) continue

    const remaining = rest.slice(0, i).concat(rest.slice(i + 1))
    const sub = pairPool(remaining, played)
    if (sub) {
      return [{ homeTeamId: head, awayTeamId: candidate }, ...sub]
    }
  }

  return null
}
