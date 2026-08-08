import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Match from '#models/match'
import { computeStandings, DEFAULT_SCORING } from '#services/standings'
import type { Scoring } from '#services/standings'

/**
 * Progression des brackets (sous-issue #45 de #31).
 *
 * Fait « avancer » un tournoi à formats v2 au fil des résultats :
 *  - propage le **vainqueur / perdant** d'un match vers les slots aval qui le
 *    référencent (`match_winner` / `match_loser`) ;
 *  - **seed** la phase finale hybride depuis le **classement de poule**
 *    (`pool_rank`) dès qu'une poule est terminée.
 *
 * Le cœur de décision (`planProgression`) est **pur** (structures simples, aucune
 * dépendance DB) → testable. La couche DB se contente de charger les matchs,
 * d'appliquer les remplissages et de propager d'éventuelles erreurs.
 *
 * Correction (§9) : un score reste corrigeable. Si la correction change l'issue
 * d'un match dont un match **aval déjà joué** dépend, on **bloque** (pas de
 * cascade destructrice en v2) via `ProgressionConflictError`.
 */

/** Levée quand une correction impacterait un match aval déjà joué. */
export class ProgressionConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProgressionConflictError'
  }
}

/** Vue « plate » d'un match, suffisante à la décision de progression (→ testable). */
export interface ProgressMatch {
  id: number
  stage: string
  groupLabel: string | null
  status: string
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number | null
  awayScore: number | null
  homeSourceType: string | null
  homeSourceMatchId: number | null
  homeSourcePool: string | null
  homeSourceRank: number | null
  awaySourceType: string | null
  awaySourceMatchId: number | null
  awaySourcePool: string | null
  awaySourceRank: number | null
}

/** Un remplissage de slot décidé par la progression. */
export interface SlotFill {
  matchId: number
  side: 'home' | 'away'
  teamId: number
}

export interface ProgressionPlan {
  fills: SlotFill[]
  /** Premier conflit détecté (correction impactant un match aval déjà joué), le cas échéant. */
  conflict?: string
}

const isSettled = (m: { status: string }) => m.status === 'finished' || m.status === 'forfeit'

/** Vainqueur / perdant d'un match réglé aux deux équipes connues, ou null (nul, non réglé…). */
export function outcomeOf(m: ProgressMatch): { winnerId: number; loserId: number } | null {
  if (!isSettled(m)) return null
  if (m.homeTeamId === null || m.awayTeamId === null) return null
  if (m.homeScore === null || m.awayScore === null) return null
  if (m.homeScore > m.awayScore) return { winnerId: m.homeTeamId, loserId: m.awayTeamId }
  if (m.awayScore > m.homeScore) return { winnerId: m.awayTeamId, loserId: m.homeTeamId }
  return null // nul → pas de vainqueur, on ne propage pas
}

/** Xᵉ du classement d'une poule terminée (`pool`), ou null si la poule n'est pas finie. */
function poolQualifier(
  matches: ProgressMatch[],
  teamsById: Map<number, string>,
  pool: string,
  rank: number,
  scoring: Scoring
): number | null {
  const poolMatches = matches.filter((m) => m.stage === 'pool' && m.groupLabel === pool)
  if (poolMatches.length === 0) return null
  if (!poolMatches.every(isSettled)) return null // poule non terminée → pas encore de qualifiés

  const teamIds = new Set<number>()
  for (const m of poolMatches) {
    if (m.homeTeamId !== null) teamIds.add(m.homeTeamId)
    if (m.awayTeamId !== null) teamIds.add(m.awayTeamId)
  }
  const teams = [...teamIds].map((id) => ({ id, name: teamsById.get(id) ?? `#${id}` }))
  const played = poolMatches
    .filter((m) => m.homeTeamId !== null && m.awayTeamId !== null)
    .filter((m) => m.homeScore !== null && m.awayScore !== null)
    .map((m) => ({
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
    }))

  const standings = computeStandings(teams, played, scoring)
  return standings[rank - 1]?.teamId ?? null
}

/** Équipe « correcte » pour un slot différé, ou null si sa source n'est pas encore résolue. */
function resolveSlot(
  matches: ProgressMatch[],
  byId: Map<number, ProgressMatch>,
  teamsById: Map<number, string>,
  type: string | null,
  matchId: number | null,
  pool: string | null,
  rank: number | null,
  scoring: Scoring
): number | null {
  switch (type) {
    case 'match_winner': {
      const feeder = matchId !== null ? byId.get(matchId) : undefined
      return feeder ? (outcomeOf(feeder)?.winnerId ?? null) : null
    }
    case 'match_loser': {
      const feeder = matchId !== null ? byId.get(matchId) : undefined
      return feeder ? (outcomeOf(feeder)?.loserId ?? null) : null
    }
    case 'pool_rank':
      return pool !== null && rank !== null
        ? poolQualifier(matches, teamsById, pool, rank, scoring)
        : null
    default:
      return null // 'team' / null : slot déjà concret, rien à résoudre
  }
}

/**
 * Décide, à partir de l'état courant des matchs, les slots différés à (re)remplir.
 *
 * Idempotent : un slot déjà correct n'est pas ré-écrit. Un slot vide est rempli.
 * Un slot déjà rempli mais devenu incorrect (après correction en amont) est
 * corrigé **si son match n'est pas encore joué**, sinon c'est un **conflit**.
 */
export function planProgression(
  matches: ProgressMatch[],
  teamsById: Map<number, string>,
  scoring: Scoring = DEFAULT_SCORING
): ProgressionPlan {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const fills: SlotFill[] = []
  let conflict: string | undefined

  const CONFLICT_MSG =
    'Correction impossible : un match suivant du tableau est déjà joué. ' +
    "Impossible de changer rétroactivement qui y participe — corrigez d'abord le match aval."

  for (const m of matches) {
    for (const side of ['home', 'away'] as const) {
      const type = side === 'home' ? m.homeSourceType : m.awaySourceType
      if (type !== 'match_winner' && type !== 'match_loser' && type !== 'pool_rank') continue

      const current = side === 'home' ? m.homeTeamId : m.awayTeamId
      const correct = resolveSlot(
        matches,
        byId,
        teamsById,
        type,
        side === 'home' ? m.homeSourceMatchId : m.awaySourceMatchId,
        side === 'home' ? m.homeSourcePool : m.awaySourcePool,
        side === 'home' ? m.homeSourceRank : m.awaySourceRank,
        scoring
      )

      if (correct === null || correct === current) continue // pas encore résoluble, ou déjà bon
      if (current !== null && isSettled(m)) {
        conflict = CONFLICT_MSG // le slot changerait sur un match déjà joué
        continue
      }
      fills.push({ matchId: m.id, side, teamId: correct })
    }
  }

  return conflict ? { fills: [], conflict } : { fills }
}

/** Projette un modèle `Match` sur la vue plate de progression. */
function toProgressMatch(m: Match): ProgressMatch {
  return {
    id: m.id,
    stage: m.stage,
    groupLabel: m.groupLabel,
    status: m.status,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeSourceType: m.homeSourceType,
    homeSourceMatchId: m.homeSourceMatchId,
    homeSourcePool: m.homeSourcePool,
    homeSourceRank: m.homeSourceRank,
    awaySourceType: m.awaySourceType,
    awaySourceMatchId: m.awaySourceMatchId,
    awaySourcePool: m.awaySourcePool,
    awaySourceRank: m.awaySourceRank,
  }
}

/**
 * Applique la progression aux matchs d'un tournoi dans la transaction fournie.
 * Charge l'état, planifie, puis remplit les slots aval résolus.
 *
 * @returns les id des matchs modifiés (pour la diffusion SSE).
 * @throws ProgressionConflictError si une correction impacte un match aval déjà joué.
 */
export async function progressBracket(
  tournamentId: number,
  teamsById: Map<number, string>,
  trx: TransactionClientContract,
  scoring: Scoring = DEFAULT_SCORING
): Promise<number[]> {
  const rows = await Match.query({ client: trx }).where('tournament_id', tournamentId)
  const { fills, conflict } = planProgression(rows.map(toProgressMatch), teamsById, scoring)

  if (conflict) throw new ProgressionConflictError(conflict)

  const byId = new Map(rows.map((r) => [r.id, r]))
  const changed: number[] = []
  for (const f of fills) {
    const row = byId.get(f.matchId)
    if (!row) continue
    if (f.side === 'home') row.homeTeamId = f.teamId
    else row.awayTeamId = f.teamId
    row.useTransaction(trx)
    await row.save()
    changed.push(row.id)
  }
  return changed
}
