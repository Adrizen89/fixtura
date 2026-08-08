import Match from '#models/match'
import type Tournament from '#models/tournament'
import { computeStandings } from '#services/standings'
import type { StandingRow } from '#services/standings'
import { forfeitSideOf } from '#services/match_incidents'
import { participantLabel } from '#services/match_labels'
import type { ResultRow, PoolStanding } from '#services/realtime'

/** Classements par poule (formats poules / hybride) à partir des matchs de poule. */
function poolStandingsOf(matches: Match[], teamsById: Map<number, string>): PoolStanding[] {
  const poolMatches = matches.filter((m) => m.stage === 'pool' && m.groupLabel !== null)
  if (poolMatches.length === 0) return []

  const byPool = new Map<string, Match[]>()
  for (const m of poolMatches) {
    const bucket = byPool.get(m.groupLabel!) ?? []
    bucket.push(m)
    byPool.set(m.groupLabel!, bucket)
  }

  return [...byPool.keys()].sort().map((label) => {
    const pm = byPool.get(label)!
    const teamIds = new Set<number>()
    for (const m of pm) {
      if (m.homeTeamId !== null) teamIds.add(m.homeTeamId)
      if (m.awayTeamId !== null) teamIds.add(m.awayTeamId)
    }
    const teams = [...teamIds].map((id) => ({ id, name: teamsById.get(id) ?? `#${id}` }))
    const played = pm
      .filter(
        (m) =>
          m.homeTeamId !== null &&
          m.awayTeamId !== null &&
          m.homeScore !== null &&
          m.awayScore !== null
      )
      .map((m) => ({
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: m.homeScore!,
        awayScore: m.awayScore!,
      }))
    return { label, standings: computeStandings(teams, played) }
  })
}

/**
 * Construit l'état « résultats » d'un tournoi : lignes de matchs + classement
 * global + classements par poule (calculés à la volée — jamais stockés, cf.
 * CLAUDE.md §5).
 *
 * Partagé entre l'admin (ResultsController : rendu + diffusion SSE) et l'écran
 * public (PublicController), pour que la grille de saisie, le flux temps réel et
 * l'affichage public montrent exactement la même chose. Le tournoi doit avoir ses
 * `teams` préchargées. Robuste aux participants **différés** (slots bracket non
 * résolus) : ceux-ci sont nommés depuis leur source, jamais déréférencés.
 *
 * `withUpdatedBy` (issue #41) : ne précharge l'auteur de la dernière saisie
 * (`updatedByUser`) que quand il est **affiché** — la grille admin (« Saisi par… »)
 * et le flux SSE qui l'alimente. Les écrans publics et les exports ne l'affichent
 * pas : ils passent `false` et évitent une jointure inutile à chaque rendu.
 */
export async function buildResultsData(
  tournament: Tournament,
  options: { withUpdatedBy?: boolean } = {}
): Promise<{ matches: ResultRow[]; standings: StandingRow[]; pools: PoolStanding[] }> {
  const { withUpdatedBy = true } = options

  const matches = await Match.query()
    .where('tournament_id', tournament.id)
    .preload('homeTeam')
    .preload('awayTeam')
    .if(withUpdatedBy, (q) => q.preload('updatedByUser'))
    .orderBy('scheduled_at')
    .orderBy('terrain_number')

  const byId = new Map(matches.map((m) => [m.id, m]))

  const rows: ResultRow[] = matches.map((m) => {
    // Un match « réglé » a un résultat : score saisi (finished) ou forfait.
    const settled = m.status === 'finished' || m.status === 'forfeit'
    return {
      id: m.id,
      time: m.scheduledAt.toUTC().toFormat('HH:mm'),
      terrainNumber: m.terrainNumber,
      homeTeam: participantLabel(m, 'home', byId),
      awayTeam: participantLabel(m, 'away', byId),
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      // Côté forfaitaire (pour marquer l'équipe concernée à l'affichage), ou null.
      // Sans équipes connues (slot bracket non résolu), pas de côté forfaitaire.
      forfeitSide:
        m.homeTeamId !== null && m.awayTeamId !== null
          ? forfeitSideOf(m.status, m.forfeitTeamId, m.homeTeamId, m.awayTeamId)
          : null,
      updatedBy: m.updatedByUser ? (m.updatedByUser.fullName ?? m.updatedByUser.email) : null,
      updatedAt: settled && m.updatedAt ? m.updatedAt.toISO() : null,
      stage: m.stage,
      bracketRound: m.bracketRound,
      bracketSlot: m.bracketSlot,
      groupLabel: m.groupLabel,
    }
  })

  const teamsById = new Map(tournament.teams.map((t) => [t.id, t.name]))

  const standings = computeStandings(
    tournament.teams.map((t) => ({ id: t.id, name: t.name })),
    matches
      .filter(
        (m) =>
          m.homeTeamId !== null &&
          m.awayTeamId !== null &&
          m.homeScore !== null &&
          m.awayScore !== null
      )
      .map((m) => ({
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: m.homeScore!,
        awayScore: m.awayScore!,
      }))
  )

  return { matches: rows, standings, pools: poolStandingsOf(matches, teamsById) }
}
