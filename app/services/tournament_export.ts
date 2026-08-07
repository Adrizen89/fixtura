import type { DateTime } from 'luxon'
import type Match from '#models/match'
import type Tournament from '#models/tournament'
import type { TournamentFormat } from '#models/tournament'
import { viewFromMatches } from '#services/planning'
import type { PlanningView } from '#services/planning'
import { buildResultsData } from '#services/tournament_results'
import { participantLabel, bracketRoundShort } from '#services/match_labels'
import type { StandingRow } from '#services/standings'
import type { PoolStanding } from '#services/realtime'

/**
 * Assemblage des vues d'export / impression PDF (cf. CLAUDE.md §5, §9 · issue #38).
 *
 * Indispensable le jour J : imprimer le planning, distribuer les feuilles de match
 * aux terrains, afficher le classement final. Les pages sont rendues par des
 * templates Edge autonomes, pensés pour une impression **noir & blanc lisible**,
 * puis « Enregistrer en PDF » via le navigateur (aucune dépendance PDF côté serveur,
 * cf. §13 : pas de lib lourde).
 *
 * Ce module ne fait qu'assembler des données déjà calculées par les services
 * existants (planning, classement) — contrôleur mince (§8).
 */

/** En-tête commun à toutes les feuilles d'export (identité du tournoi). */
export interface ExportHeader {
  name: string
  category: string
  /** Date de l'événement, formatée en français long (« lundi 1 septembre 2026 »). */
  eventDate: string
  /** Libellé lisible du format (« Championnat », « Poules »…). */
  formatLabel: string
  numTerrains: number
}

/** Une feuille de match à distribuer au terrain (score à remplir à la main). */
export interface MatchSheet {
  time: string
  terrainNumber: number
  /** Contexte de phase : « Journée 2 », « Poule A », « Quart de finale »… */
  phaseLabel: string
  homeTeam: string
  awayTeam: string
}

/** Vue complète « planning » à imprimer. */
export interface PlanningExport {
  header: ExportHeader
  planning: PlanningView
}

/** Vue complète « feuilles de match » à imprimer. */
export interface MatchSheetsExport {
  header: ExportHeader
  sheets: MatchSheet[]
}

/** Vue complète « classement » à imprimer (global + par poule le cas échéant). */
export interface StandingsExport {
  header: ExportHeader
  /** Classement global (championnat) — vide si le tournoi se joue par poules. */
  standings: StandingRow[]
  /** Classements par poule (poules / hybride) — vide sinon. */
  pools: PoolStanding[]
  /** Au moins un match a été joué (sinon on affiche un état vide explicite). */
  hasResults: boolean
}

/** Libellé lisible du format de compétition. */
export function formatLabel(format: TournamentFormat): string {
  switch (format) {
    case 'pools':
      return 'Poules'
    case 'knockout':
      return 'Élimination directe'
    case 'hybrid':
      return 'Poules + élimination'
    default:
      return 'Championnat'
  }
}

/** Date de l'événement en français long, pour l'en-tête des pages imprimées. */
export function formatEventDate(date: DateTime): string {
  return date.setLocale('fr').toFormat('cccc d LLLL yyyy')
}

/** En-tête d'export d'un tournoi. */
export function exportHeaderOf(tournament: Tournament): ExportHeader {
  return {
    name: tournament.name,
    category: tournament.category,
    eventDate: formatEventDate(tournament.eventDate),
    formatLabel: formatLabel(tournament.format),
    numTerrains: tournament.numTerrains,
  }
}

/**
 * Libellé de phase d'un match, pour situer une feuille de match : la journée en
 * championnat, la poule en format poules, le tour en élimination directe.
 */
function phaseLabelOf(match: Match): string {
  if (match.stage === 'pool' && match.groupLabel) return `Poule ${match.groupLabel}`
  if (match.stage === 'knockout') return bracketRoundShort(match.bracketRound)
  return `Journée ${match.roundNumber}`
}

/** Assemble la vue « planning » (réutilise la grille déjà calculée). */
export function buildPlanningExport(tournament: Tournament, matches: Match[]): PlanningExport {
  return {
    header: exportHeaderOf(tournament),
    planning: viewFromMatches(matches, tournament.matchDurationMin),
  }
}

/**
 * Assemble les feuilles de match (une par match, dans l'ordre du planning). Les
 * participants différés (slot de bracket non résolu) sont nommés lisiblement via
 * `participantLabel` (« Vainqueur Quart #1 »…), jamais déréférencés.
 */
export function buildMatchSheetsExport(
  tournament: Tournament,
  matches: Match[]
): MatchSheetsExport {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const sheets: MatchSheet[] = matches.map((m) => ({
    time: m.scheduledAt.toUTC().toFormat('HH:mm'),
    terrainNumber: m.terrainNumber,
    phaseLabel: phaseLabelOf(m),
    homeTeam: participantLabel(m, 'home', byId),
    awayTeam: participantLabel(m, 'away', byId),
  }))

  return { header: exportHeaderOf(tournament), sheets }
}

/**
 * Assemble la vue « classement » : classement global (championnat) et/ou par poule
 * (poules / hybride). Le tournoi doit avoir ses `teams` préchargées.
 */
export async function buildStandingsExport(tournament: Tournament): Promise<StandingsExport> {
  const { standings, pools } = await buildResultsData(tournament)
  const hasResults =
    standings.some((r) => r.played > 0) || pools.some((p) => p.standings.some((r) => r.played > 0))

  return {
    header: exportHeaderOf(tournament),
    // En formats à poules, le classement global n'a pas de sens : on n'expose que
    // les classements de poule.
    standings: pools.length > 0 ? [] : standings,
    pools,
    hasResults,
  }
}
