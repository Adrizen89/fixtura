/**
 * API de lecture publique (issue #122, sous-issue de #103) — **contrat JSON stable
 * et versionné**, TypeScript pur (aucune dépendance DB → testable).
 *
 * Ce module ne fait que **mapper** des données déjà calculées (planning, résultats,
 * classement via `buildResultsData`) vers des DTO publics **découplés** des types
 * internes : le contrat exposé aux intégrations tierces reste ainsi stable même si
 * les structures internes évoluent. On n'expose que des données **publiques**
 * (noms d'équipes, scores) — jamais d'`id` de club, d'organisateur ni de contact
 * (cf. CLAUDE.md §5, §10).
 */

import type { StandingRow } from '#services/standings'
import type { ResultRow, PoolStanding } from '#services/realtime'

/** Version courante du contrat (chemin `/api/v1/…` + champ `apiVersion`). */
export const API_VERSION = '1'

export interface ApiStanding {
  rank: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface ApiMatch {
  /** Heure de début "HH:mm". */
  time: string
  terrain: number
  /** Phase : `main` | `pool` | `knockout`. */
  stage: string
  /** Tour de bracket (`qf`, `sf`, `final`, `wb-r1`…) ou null. */
  round: string | null
  /** Libellé de poule (`A`, `B`…) ou null. */
  pool: string | null
  home: string
  away: string
  homeScore: number | null
  awayScore: number | null
  /** `scheduled` | `live` | `finished` | `forfeit`. */
  status: string
  /** Côté forfaitaire, ou null. */
  forfeit: 'home' | 'away' | null
  /** Côté vainqueur aux tirs au but (nul en élimination), ou null. */
  shootoutWinner: 'home' | 'away' | null
}

export interface ApiPool {
  label: string
  standings: ApiStanding[]
}

/** Identité d'un tournoi / d'une catégorie. */
export interface ApiTournamentMeta {
  name: string
  category: string
  /** Date de l'événement "YYYY-MM-DD", ou null. */
  date: string | null
  status: string
  format: string
  slug: string
}

/** Bloc « résultats » commun à un tournoi et à une catégorie d'événement. */
export interface ApiResults {
  standings: ApiStanding[]
  pools: ApiPool[]
  matches: ApiMatch[]
}

export interface ApiTournamentPayload extends ApiResults {
  apiVersion: string
  club: { name: string }
  tournament: ApiTournamentMeta
}

export interface ApiEventPayload {
  apiVersion: string
  club: { name: string }
  event: { name: string; date: string | null; status: string; slug: string }
  categories: (ApiTournamentMeta & ApiResults)[]
}

/** Données de résultats déjà calculées (sortie de `buildResultsData`). */
export interface ResultsInput {
  standings: StandingRow[]
  pools: PoolStanding[]
  matches: ResultRow[]
}

export function serializeStanding(r: StandingRow): ApiStanding {
  return {
    rank: r.rank,
    team: r.teamName,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
    points: r.points,
  }
}

export function serializeMatch(m: ResultRow): ApiMatch {
  return {
    time: m.time,
    terrain: m.terrainNumber,
    stage: m.stage,
    round: m.bracketRound,
    pool: m.groupLabel,
    home: m.homeTeam,
    away: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    forfeit: m.forfeitSide,
    shootoutWinner: m.shootoutWinnerSide,
  }
}

function serializeResults(data: ResultsInput): ApiResults {
  return {
    standings: data.standings.map(serializeStanding),
    pools: data.pools.map((p) => ({
      label: p.label,
      standings: p.standings.map(serializeStanding),
    })),
    matches: data.matches.map(serializeMatch),
  }
}

export function serializeTournamentPayload(
  clubName: string,
  meta: ApiTournamentMeta,
  data: ResultsInput
): ApiTournamentPayload {
  return {
    apiVersion: API_VERSION,
    club: { name: clubName },
    tournament: meta,
    ...serializeResults(data),
  }
}

export function serializeEventPayload(
  clubName: string,
  event: { name: string; date: string | null; status: string; slug: string },
  categories: { meta: ApiTournamentMeta; data: ResultsInput }[]
): ApiEventPayload {
  return {
    apiVersion: API_VERSION,
    club: { name: clubName },
    event,
    categories: categories.map(({ meta, data }) => ({ ...meta, ...serializeResults(data) })),
  }
}
