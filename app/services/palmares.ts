/**
 * Service de palmarès (issue #109, sous-issue de #98) — TypeScript **pur**, aucune
 * dépendance DB, testable unitairement.
 *
 * Le palmarès n'est JAMAIS stocké (cf. CLAUDE.md §5, §13) : il est recalculé à la
 * volée à partir des tournois terminés du club. Il produit deux vues :
 *  - le **palmarès par édition** : vainqueur (et finaliste) de chaque tournoi passé ;
 *  - le **bilan cumulé par équipe** : participations, victoires de tournoi et ratio,
 *    agrégés sur tout l'historique (les équipes n'étant qu'un **nom**, l'agrégation
 *    se fait par nom — une même équipe revient d'une édition à l'autre).
 *
 * Détermination du vainqueur, tous formats confondus :
 *  1. s'il existe une **finale de tableau** (`stage = 'knockout'`,
 *     `bracketRound = 'final'`) tranchée → vainqueur = vainqueur de la finale,
 *     finaliste = perdant (formats élimination directe / hybride) ;
 *  2. sinon → tête du **classement général** (championnat / poules), vainqueur =
 *     1er, finaliste = 2e. Le classement respecte le barème du tournoi (#104) et les
 *     départages (#33) via `computeStandings`.
 */

import { computeStandings, DEFAULT_SCORING } from '#services/standings'
import type { Scoring, StandingsMatchInput } from '#services/standings'

/** Vue « plate » d'un match, suffisante au calcul du palmarès (→ testable). */
export interface PalmaresMatchInput {
  stage: string
  bracketRound: string | null
  status: string
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number | null
  awayScore: number | null
}

/** Un tournoi terminé à dépouiller (données simples, aucune entité Lucid). */
export interface PalmaresTournamentInput {
  id: number
  name: string
  category: string
  eventDate: string | null
  format: string
  teams: { id: number; name: string }[]
  matches: PalmaresMatchInput[]
  /** Barème du tournoi (#104) ; 3/1/0 par défaut. */
  scoring?: Scoring
}

/** Une équipe distinguée (vainqueur / finaliste) d'une édition. */
export interface Laureate {
  teamId: number
  teamName: string
}

/** Le résultat d'une édition : son vainqueur et son finaliste, le cas échéant. */
export interface EditionResult {
  tournamentId: number
  name: string
  category: string
  eventDate: string | null
  format: string
  winner: Laureate | null
  finalist: Laureate | null
}

/** Le bilan cumulé d'une équipe (agrégé par nom) sur l'historique du club. */
export interface TeamRecord {
  teamName: string
  /** Nombre d'éditions terminées auxquelles l'équipe a participé. */
  participations: number
  /** Nombre d'éditions remportées. */
  wins: number
  /** Nombre de finales atteintes (vainqueur ou finaliste). */
  finals: number
  /** Ratio victoires / participations (0 à 1). */
  winRate: number
}

export interface Palmares {
  editions: EditionResult[]
  teamRecords: TeamRecord[]
}

const isSettled = (m: PalmaresMatchInput) => m.status === 'finished' || m.status === 'forfeit'

/** Vainqueur / perdant d'un match tranché aux deux équipes connues, ou null. */
function outcome(m: PalmaresMatchInput): { winnerId: number; loserId: number } | null {
  if (!isSettled(m)) return null
  if (m.homeTeamId === null || m.awayTeamId === null) return null
  if (m.homeScore === null || m.awayScore === null) return null
  if (m.homeScore > m.awayScore) return { winnerId: m.homeTeamId, loserId: m.awayTeamId }
  if (m.awayScore > m.homeScore) return { winnerId: m.awayTeamId, loserId: m.homeTeamId }
  return null // nul → pas de vainqueur
}

/** Ne garde que les matchs comptabilisables au classement (2 équipes + 2 scores). */
function playedMatches(matches: PalmaresMatchInput[]): StandingsMatchInput[] {
  return matches
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
}

/** Vainqueur et finaliste d'une édition, selon la règle unifiée (cf. en-tête). */
export function editionResult(tournament: PalmaresTournamentInput): EditionResult {
  const meta = {
    tournamentId: tournament.id,
    name: tournament.name,
    category: tournament.category,
    eventDate: tournament.eventDate,
    format: tournament.format,
  }
  const nameOf = new Map(tournament.teams.map((t) => [t.id, t.name]))
  const laureate = (id: number | undefined | null): Laureate | null =>
    id === undefined || id === null ? null : { teamId: id, teamName: nameOf.get(id) ?? `#${id}` }

  // 1. Finale de tableau tranchée (élimination directe / hybride).
  const final = tournament.matches.find((m) => m.stage === 'knockout' && m.bracketRound === 'final')
  if (final) {
    const oc = outcome(final)
    if (oc) {
      return { ...meta, winner: laureate(oc.winnerId), finalist: laureate(oc.loserId) }
    }
    // Finale présente mais non tranchée (rare pour un tournoi terminé) → repli classement.
  }

  // 2. Tête du classement général (championnat / poules).
  const played = playedMatches(tournament.matches)
  // Aucun match joué → pas de vainqueur signifiant (le classement serait à égalité 0-0).
  if (played.length === 0) {
    return { ...meta, winner: null, finalist: null }
  }
  const standings = computeStandings(
    tournament.teams,
    played,
    tournament.scoring ?? DEFAULT_SCORING
  )
  const winner = standings[0] ?? null
  const runnerUp = standings[1] ?? null
  return {
    ...meta,
    winner: winner ? { teamId: winner.teamId, teamName: winner.teamName } : null,
    finalist: runnerUp ? { teamId: runnerUp.teamId, teamName: runnerUp.teamName } : null,
  }
}

/**
 * Calcule le palmarès complet du club : résultats par édition (triés du plus récent)
 * + bilan cumulé par équipe (agrégé par nom).
 */
export function computePalmares(tournaments: PalmaresTournamentInput[]): Palmares {
  const editions = tournaments.map(editionResult)

  // Bilan cumulé par nom d'équipe.
  const records = new Map<string, { participations: number; wins: number; finals: number }>()
  const bump = (name: string, key: 'participations' | 'wins' | 'finals') => {
    const rec = records.get(name) ?? { participations: 0, wins: 0, finals: 0 }
    rec[key]++
    records.set(name, rec)
  }

  for (const [i, t] of tournaments.entries()) {
    const edition = editions[i]

    // Participations : chaque nom d'équipe présent dans l'édition, dédoublonné.
    for (const name of new Set(t.teams.map((team) => team.name))) {
      bump(name, 'participations')
    }
    if (edition.winner) {
      bump(edition.winner.teamName, 'wins')
      bump(edition.winner.teamName, 'finals')
    }
    // Le finaliste atteint la finale sans la gagner (jamais confondu avec le vainqueur).
    if (edition.finalist && edition.finalist.teamId !== edition.winner?.teamId) {
      bump(edition.finalist.teamName, 'finals')
    }
  }

  const teamRecords: TeamRecord[] = [...records.entries()]
    .map(([teamName, r]) => ({
      teamName,
      participations: r.participations,
      wins: r.wins,
      finals: r.finals,
      winRate: r.participations > 0 ? r.wins / r.participations : 0,
    }))
    // Les plus titrées d'abord : victoires ↓, finales ↓, participations ↓, nom ↑.
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.finals - a.finals ||
        b.participations - a.participations ||
        a.teamName.localeCompare(b.teamName)
    )

  // Éditions : de la plus récente à la plus ancienne (date ↓), puis nom ↑ (déterministe).
  const sortedEditions = [...editions].sort(
    (a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? '') || a.name.localeCompare(b.name)
  )

  return { editions: sortedEditions, teamRecords }
}
