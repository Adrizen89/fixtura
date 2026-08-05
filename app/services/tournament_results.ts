import Match from '#models/match'
import type Tournament from '#models/tournament'
import { computeStandings } from '#services/standings'
import type { StandingRow } from '#services/standings'
import type { ResultRow } from '#services/realtime'

/**
 * Construit l'état « résultats » d'un tournoi : lignes de matchs + classement
 * calculé à la volée (jamais stocké — cf. CLAUDE.md §5).
 *
 * Partagé entre l'admin (ResultsController : rendu + diffusion SSE) et l'écran
 * public (PublicController), pour que la grille de saisie, le flux temps réel et
 * l'affichage public montrent exactement la même chose. Le tournoi doit avoir ses
 * `teams` préchargées.
 */
export async function buildResultsData(
  tournament: Tournament
): Promise<{ matches: ResultRow[]; standings: StandingRow[] }> {
  const matches = await Match.query()
    .where('tournament_id', tournament.id)
    .preload('homeTeam')
    .preload('awayTeam')
    .preload('updatedByUser')
    .orderBy('scheduled_at')
    .orderBy('terrain_number')

  const rows: ResultRow[] = matches.map((m) => ({
    id: m.id,
    time: m.scheduledAt.toUTC().toFormat('HH:mm'),
    terrainNumber: m.terrainNumber,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    updatedBy: m.updatedByUser ? (m.updatedByUser.fullName ?? m.updatedByUser.email) : null,
    updatedAt: m.status === 'finished' && m.updatedAt ? m.updatedAt.toISO() : null,
  }))

  const standings = computeStandings(
    tournament.teams.map((t) => ({ id: t.id, name: t.name })),
    matches
      .filter((m) => m.homeScore !== null && m.awayScore !== null)
      .map((m) => ({
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore!,
        awayScore: m.awayScore!,
      }))
  )

  return { matches: rows, standings }
}
