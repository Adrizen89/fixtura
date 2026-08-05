/**
 * Service de classement — TypeScript pur, aucune dépendance DB, testable unitairement.
 *
 * Le classement n'est JAMAIS stocké en base (cf. CLAUDE.md §5) : il est recalculé à
 * la volée à partir des matchs terminés. Règles football :
 *   victoire = 3 pts, nul = 1, défaite = 0.
 * Départage v1 : points → différence de buts → buts marqués (puis nom, pour un ordre
 * stable et déterministe).
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

  // Tri : points ↓, diff. de buts ↓, buts marqués ↓, puis nom ↑ (déterministe).
  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName)
  )

  // Rangs : deux équipes départagées de façon identique (points, diff, BP) partagent
  // le même rang ; le rang suivant reprend la position absolue (classement standard).
  sorted.forEach((row, index) => {
    const prev = sorted[index - 1]
    const tiedWithPrev =
      prev &&
      prev.points === row.points &&
      prev.goalDifference === row.goalDifference &&
      prev.goalsFor === row.goalsFor
    row.rank = tiedWithPrev ? prev.rank : index + 1
  })

  return sorted
}
