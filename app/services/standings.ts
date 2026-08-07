/**
 * Service de classement — TypeScript pur, aucune dépendance DB, testable unitairement.
 *
 * Le classement n'est JAMAIS stocké en base (cf. CLAUDE.md §5) : il est recalculé à
 * la volée à partir des matchs terminés. Règles football :
 *   victoire = 3 pts, nul = 1, défaite = 0.
 * Départage (issue #33) : points → confrontation directe → différence de buts →
 * buts marqués (puis nom, pour un ordre stable et déterministe).
 *
 * La « confrontation directe » est un mini-classement calculé sur les SEULS matchs
 * joués entre les équipes encore à égalité (points identiques). Il gère nativement
 * les égalités à 3+ équipes : le mini-classement est réappliqué récursivement au
 * sous-groupe qui reste à égalité, avant de retomber sur les critères généraux.
 */

/** Une équipe du tournoi. */
export interface StandingsTeamInput {
  id: number
  name: string
}

/**
 * Un match COMPTABILISÉ dans le classement : les deux scores sont connus.
 * Le filtrage (match terminé, scores saisis) est à la charge de l'appelant afin de
 * garder ce service pur et indépendant des statuts SQL.
 */
export interface StandingsMatchInput {
  homeTeamId: number
  awayTeamId: number
  homeScore: number
  awayScore: number
}

/** Une ligne de classement (agrégats + rang). */
export interface StandingRow {
  rank: number
  teamId: number
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

const WIN_POINTS = 3
const DRAW_POINTS = 1

/**
 * Calcule le classement d'un tournoi.
 *
 * @param teams   Toutes les équipes du tournoi (celles sans match apparaissent à 0).
 * @param matches Uniquement les matchs à comptabiliser (deux scores connus).
 * @returns Les lignes triées, rang renseigné (les équipes à égalité parfaite
 *          partagent le même rang).
 */
export function computeStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[]
): StandingRow[] {
  // Accumulateur par équipe, initialisé pour TOUTES les équipes (0 partout).
  const rows = new Map<number, StandingRow>()
  for (const team of teams) {
    rows.set(team.id, {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })
  }

  for (const match of matches) {
    const home = rows.get(match.homeTeamId)
    const away = rows.get(match.awayTeamId)
    // Un match dont une équipe n'appartient pas au tournoi est ignoré (robustesse).
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.won++
      away.lost++
    } else if (match.homeScore < match.awayScore) {
      away.won++
      home.lost++
    } else {
      home.drawn++
      away.drawn++
    }
  }

  // Dérive points et différence de buts.
  for (const row of rows.values()) {
    row.points = row.won * WIN_POINTS + row.drawn * DRAW_POINTS
    row.goalDifference = row.goalsFor - row.goalsAgainst
  }

  // Regroupe par points (↓), puis départage chaque groupe d'ex æquo par la
  // confrontation directe. Chaque « bucket » retourné réunit des équipes réellement
  // indissociables (elles partageront le même rang).
  const byPoints = [...rows.values()].sort((a, b) => b.points - a.points)
  const buckets = groupByAdjacent(byPoints, (a, b) => a.points === b.points).flatMap((group) =>
    resolveTiedGroup(group, matches)
  )

  // Aplatit les buckets en attribuant les rangs (classement standard « 1-1-3 ») :
  // le rang d'un bucket est la position absolue de sa première équipe.
  const sorted: StandingRow[] = []
  for (const bucket of buckets) {
    const rank = sorted.length + 1
    for (const row of bucket) {
      row.rank = rank
      sorted.push(row)
    }
  }

  return sorted
}

/** Agrégats de confrontation directe d'une équipe, restreints à un sous-groupe. */
interface HeadToHeadStat {
  points: number
  goalDifference: number
  goalsFor: number
}

/**
 * Mini-classement : agrège points / diff. de buts / buts marqués en ne comptant QUE
 * les matchs joués entre les équipes du sous-groupe `groupIds` (confrontation directe).
 * Les matchs impliquant une équipe hors du groupe sont ignorés.
 */
function headToHeadStats(
  groupIds: Set<number>,
  matches: StandingsMatchInput[]
): Map<number, HeadToHeadStat> {
  const stats = new Map<number, HeadToHeadStat>()
  for (const id of groupIds) {
    stats.set(id, { points: 0, goalDifference: 0, goalsFor: 0 })
  }

  for (const match of matches) {
    if (!groupIds.has(match.homeTeamId) || !groupIds.has(match.awayTeamId)) continue
    const home = stats.get(match.homeTeamId)!
    const away = stats.get(match.awayTeamId)!

    home.goalsFor += match.homeScore
    home.goalDifference += match.homeScore - match.awayScore
    away.goalsFor += match.awayScore
    away.goalDifference += match.awayScore - match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += WIN_POINTS
    } else if (match.homeScore < match.awayScore) {
      away.points += WIN_POINTS
    } else {
      home.points += DRAW_POINTS
      away.points += DRAW_POINTS
    }
  }

  return stats
}

/**
 * Départage un groupe d'équipes à égalité de points, en le découpant en buckets
 * ordonnés (chaque bucket = équipes indissociables, même rang).
 *
 * 1. Confrontation directe : mini-classement (points → diff. → BP) sur les seuls
 *    matchs entre les équipes du groupe. Si elle sépare le groupe, on récurse dans
 *    chaque sous-groupe encore à égalité (le mini-classement est alors recalculé sur
 *    le sous-groupe réduit — cas des égalités à 3+ équipes).
 * 2. Repli : lorsque la confrontation directe ne départage plus (aucun match commun,
 *    ou égalité circulaire), on retombe sur les critères généraux : différence de
 *    buts → buts marqués → nom (déterministe).
 */
function resolveTiedGroup(group: StandingRow[], matches: StandingsMatchInput[]): StandingRow[][] {
  if (group.length <= 1) return [group]

  const groupIds = new Set(group.map((r) => r.teamId))
  const h2h = headToHeadStats(groupIds, matches)
  const stat = (row: StandingRow) => h2h.get(row.teamId)!

  const byHeadToHead = [...group].sort(
    (a, b) =>
      stat(b).points - stat(a).points ||
      stat(b).goalDifference - stat(a).goalDifference ||
      stat(b).goalsFor - stat(a).goalsFor
  )
  const h2hClasses = groupByAdjacent(
    byHeadToHead,
    (a, b) =>
      stat(a).points === stat(b).points &&
      stat(a).goalDifference === stat(b).goalDifference &&
      stat(a).goalsFor === stat(b).goalsFor
  )

  // La confrontation directe a séparé le groupe → on affine chaque sous-groupe
  // (strictement plus petit ⇒ récursion garantie de terminer).
  if (h2hClasses.length > 1) {
    return h2hClasses.flatMap((cls) => resolveTiedGroup(cls, matches))
  }

  // Confrontation directe indécise → critères généraux ; les équipes encore égales
  // (même diff. ET mêmes BP) sont indissociables et partagent un bucket.
  const byOverall = [...group].sort(
    (a, b) =>
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName)
  )
  return groupByAdjacent(
    byOverall,
    (a, b) => a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor
  )
}

/** Regroupe les éléments adjacents consécutifs d'une liste triée vérifiant `equal`. */
function groupByAdjacent<T>(items: T[], equal: (a: T, b: T) => boolean): T[][] {
  const groups: T[][] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && equal(last[last.length - 1], item)) last.push(item)
    else groups.push([item])
  }
  return groups
}
