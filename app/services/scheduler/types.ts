/**
 * Types du module scheduler — TypeScript pur, aucune dépendance DB.
 */

export interface SchedulerParams {
  /** Identifiants d'équipes (≥ 2, uniques). */
  teamIds: number[]
  /** Nombre de terrains disponibles (≥ 1). */
  numTerrains: number
  /** Heure de début "HH:mm". */
  startTime: string
  /** Durée d'un match en minutes (≥ 1). */
  matchDurationMin: number
  /** Pause entre matchs en minutes (≥ 0). */
  breakDurationMin: number
  /** Début de la pause déjeuner "HH:mm", ou null/absent. */
  lunchStart?: string | null
  /** Durée de la pause déjeuner en minutes (par défaut 0). */
  lunchDurationMin?: number
}

/** Un appariement issu du round-robin (avant placement horaire). */
export interface Pairing {
  /** Journée round-robin (1-based). */
  roundNumber: number
  homeTeamId: number
  awayTeamId: number
}

/** Un match placé dans le planning. */
export interface ScheduledMatch {
  /** Journée round-robin d'origine. */
  roundNumber: number
  /** Créneau temporel (0-based). */
  slotIndex: number
  /** Terrain (1-based). */
  terrainNumber: number
  /** Début du match en minutes depuis minuit. */
  startsAtMinutes: number
  /** Début du match "HH:mm". */
  startTime: string
  homeTeamId: number
  awayTeamId: number
}

export interface Schedule {
  matches: ScheduledMatch[]
  /** Nombre total de créneaux, créneaux de repos compris. */
  slotsCount: number
  /** Nombre de créneaux vides (repos forcé, aucun terrain utilisé). */
  restSlots: number
  /** Nombre de journées round-robin. */
  rounds: number
  /** Fin du dernier match, en minutes depuis minuit. */
  endsAtMinutes: number
}

// ---------------------------------------------------------------------------
// Élimination directe (bracket) — participants différés. Cf. #44 / #31.
// Module pur : aucune dépendance DB. Le vocabulaire des sources est aligné sur
// les colonnes `*_source_*` de la table `matches` (#42), pour un pont de
// persistance trivial (sous-issue 5).
// ---------------------------------------------------------------------------

/**
 * Provenance du participant d'un slot (domicile/extérieur) tant que l'équipe
 * n'est pas résolue. Aligné sur `SlotSourceType` du modèle Match :
 *  - `team`         : équipe connue (tête de série d'un bracket direct) ;
 *  - `match_winner` : vainqueur d'un match amont (identifiant abstrait) ;
 *  - `match_loser`  : perdant d'un match amont (petite finale) ;
 *  - `pool_rank`    : Xᵉ d'une poule (format hybride).
 * Un « bye » n'est jamais une source : l'exempté avance directement, donc c'est
 * sa propre source qui se propage au tour suivant (aucun match n'est créé).
 */
export type SlotSource =
  | { type: 'team'; teamId: number }
  | { type: 'match_winner'; matchId: string }
  | { type: 'match_loser'; matchId: string }
  | { type: 'pool_rank'; pool: string; rank: number }
  // Repêchage inter-poules (#107) : le `index`-ᵉ meilleur `rank`-ᵉ de poule,
  // toutes poules confondues (index 1-based, 1 = le meilleur).
  | { type: 'pool_best'; rank: number; index: number }

/** Un match de l'arbre d'élimination directe (participants éventuellement différés). */
export interface BracketMatch {
  /** Identifiant abstrait et stable dans l'arbre (ex. « sf-1 »), référencé par les sources. */
  id: string
  /** Tour structurel (1-based) : 1 = premier tour, `rounds` = finale. Sert aux libellés. */
  round: number
  /** Code de tour aligné sur `matches.bracket_round` : r32 | r16 | qf | sf | final | third. */
  bracketRound: string
  /** Libellé FR du tour (« Demi-finales », « Petite finale »…). */
  label: string
  /** Position du match dans son tour (0-based) → `matches.bracket_slot`. */
  slot: number
  /**
   * Bande topologique d'ordonnancement (1-based) : un match est toujours dans une
   * bande strictement supérieure à celles de ses tours nourriciers. Sert au
   * placement horaire (un tour ne démarre pas avant la fin de ses nourriciers).
   */
  band: number
  /** Provenance du participant « domicile ». */
  home: SlotSource
  /** Provenance du participant « extérieur ». */
  away: SlotSource
  /** true pour la petite finale (3e place). */
  thirdPlace?: boolean
  /**
   * Tableau d'appartenance en double élimination : `winners` (tableau principal),
   * `losers` (repêchage) ou `grand_final`. Absent en élimination directe simple.
   */
  bracket?: 'winners' | 'losers' | 'grand_final'
}

/** Paramètres de construction d'un arbre à double élimination. */
export interface DoubleEliminationParams {
  /** Participants qualifiés, en ordre de tête de série (meilleur en premier, ≥ 2). */
  entrants: SlotSource[]
}

/** Résultat de la construction d'un arbre à double élimination. */
export interface DoubleElimination {
  /** Tous les matchs (tableau principal, repêchage, grande finale), non placés. */
  matches: BracketMatch[]
  /** Taille du tableau principal (prochaine puissance de 2 ≥ nombre de qualifiés). */
  size: number
  /** Nombre de tours du tableau principal (log2(size)). */
  winnersRounds: number
  /** Nombre de tours du repêchage (0 pour 2 qualifiés, sinon 2·(winnersRounds−1)). */
  losersRounds: number
  /** Nombre de byes (size − nombre de qualifiés), attribués aux têtes de série. */
  byes: number
  /** Profondeur d'ordonnancement (nombre de bandes topologiques). */
  bands: number
}

/** Paramètres de construction d'un arbre d'élimination directe. */
export interface KnockoutParams {
  /**
   * Participants qualifiés, en ordre de tête de série (meilleur en premier, ≥ 2).
   * Le croisement standard est appliqué (1er vs dernier, têtes 1 et 2 dans des
   * moitiés opposées) ; pour un format hybride, ordonner les entrants « vainqueurs
   * de poule d'abord, puis dauphins » produit le classique « 1er A vs 2e B ».
   */
  entrants: SlotSource[]
  /** Générer la petite finale (3e place) si l'arbre a deux demi-finales disputées. */
  thirdPlace?: boolean
}

/** Résultat de la construction d'un arbre d'élimination directe. */
export interface Bracket {
  /** Tous les matchs, ordonnés par tour puis position (petite finale après la finale). */
  matches: BracketMatch[]
  /** Taille du bracket (prochaine puissance de 2 ≥ nombre de qualifiés). */
  size: number
  /** Nombre de tours structurels (log2(size)). */
  rounds: number
  /** Nombre de byes (size − nombre de qualifiés), attribués aux têtes de série. */
  byes: number
  /** Nombre de bandes topologiques (profondeur d'ordonnancement). */
  bands: number
}
