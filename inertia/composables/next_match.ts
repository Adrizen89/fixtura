/**
 * Logique pure du « suivi d'équipe » sur l'écran public (cf. CLAUDE.md §9 · issue #39).
 *
 * Aucune dépendance à Vue ni au DOM : tout est dérivé des matchs déjà diffusés en
 * temps réel (SSE) sur le canal du tournoi. L'écran public reçoit à chaque événement
 * la liste complète des matchs à jour ; on en déduit ici, côté client :
 *   - le **prochain match** de l'équipe suivie (terrain + horaire) ;
 *   - les **changements** qui la concernent (décalage, changement de terrain, forfait
 *     adverse, résolution d'un slot différé) en comparant l'état précédent au nouvel état.
 *
 * Ces fonctions sont pures → testables unitairement, et fonctionnent sans SSE : le
 * prochain match reste calculé depuis le rendu serveur (dégradation gracieuse, pas de
 * polling — cf. CLAUDE.md §13). Le typage est structurel (indépendant de `ResultMatchRow`)
 * pour rester découplé et facilement testable.
 */

/** Un match, réduit aux champs nécessaires au suivi d'équipe. */
export interface FollowMatch {
  id: number
  /** Heure murale "HH:mm". */
  time: string
  terrainNumber: number
  /** 'scheduled' | 'live' | 'finished' | 'forfeit'. */
  status: string
  /** Côté forfaitaire si le match est un forfait, sinon null. */
  forfeitSide: 'home' | 'away' | null
  homeTeamId: number | null
  awayTeamId: number | null
  homeTeam: string
  awayTeam: string
}

/** Nature d'une alerte poussée à l'équipe suivie. */
export type TeamAlertKind = 'rescheduled' | 'terrain' | 'opponent_forfeit' | 'new_match'

/** Une alerte destinée à l'équipe suivie (message prêt à afficher). */
export interface TeamAlert {
  kind: TeamAlertKind
  /** Id du match concerné (clé de déduplication / suivi). */
  matchId: number
  message: string
}

/** Le match implique-t-il l'équipe donnée ? */
export function involves(m: FollowMatch, teamId: number): boolean {
  return m.homeTeamId === teamId || m.awayTeamId === teamId
}

/** Côté ('home' / 'away') de l'équipe dans le match, ou null si non impliquée. */
export function sideOf(m: FollowMatch, teamId: number): 'home' | 'away' | null {
  if (m.homeTeamId === teamId) return 'home'
  if (m.awayTeamId === teamId) return 'away'
  return null
}

/** Nom de l'adversaire de l'équipe dans le match (chaîne vide si non impliquée). */
export function opponentName(m: FollowMatch, teamId: number): string {
  const side = sideOf(m, teamId)
  if (side === 'home') return m.awayTeam
  if (side === 'away') return m.homeTeam
  return ''
}

/** Un match « à venir » n'est ni terminé ni forfait (il reste à jouer). */
export function isUpcoming(m: FollowMatch): boolean {
  return m.status === 'scheduled' || m.status === 'live'
}

/** Ordre chronologique stable : heure puis terrain. */
function byTimeThenTerrain(a: FollowMatch, b: FollowMatch): number {
  return a.time.localeCompare(b.time) || a.terrainNumber - b.terrainNumber
}

/**
 * Prochain match à venir de l'équipe (le plus tôt par heure puis terrain), ou null
 * si l'équipe n'a plus de match à jouer (tous terminés, ou aucun connu).
 */
export function nextMatchFor(matches: FollowMatch[], teamId: number): FollowMatch | null {
  const upcoming = matches
    .filter((m) => involves(m, teamId) && isUpcoming(m))
    .sort(byTimeThenTerrain)
  return upcoming[0] ?? null
}

/** L'équipe a au moins un match connu, tous réglés (terminé / forfait). */
export function hasFinishedAll(matches: FollowMatch[], teamId: number): boolean {
  const own = matches.filter((m) => involves(m, teamId))
  return own.length > 0 && own.every((m) => !isUpcoming(m))
}

/** Résumé « Terrain X · HH:mm · contre Y » d'un match pour l'équipe suivie. */
function matchSummary(m: FollowMatch, teamId: number): string {
  return `Terrain ${m.terrainNumber} · ${m.time} · contre ${opponentName(m, teamId)}`
}

/**
 * Compare l'état précédent (`prev`) au nouvel état (`next`) et produit les alertes
 * concernant l'équipe suivie. Ne signale que ce qui la touche : les changements des
 * autres équipes sont ignorés. Un match encore différé (id non présent avant) qui
 * fait apparaître l'équipe est signalé comme nouveau match.
 */
export function diffFollowedTeam(
  prev: FollowMatch[],
  next: FollowMatch[],
  teamId: number
): TeamAlert[] {
  const prevById = new Map(prev.filter((m) => involves(m, teamId)).map((m) => [m.id, m]))
  const alerts: TeamAlert[] = []

  for (const nm of next) {
    if (!involves(nm, teamId)) continue
    const pm = prevById.get(nm.id)

    // Slot différé résolu vers l'équipe (bracket) → nouveau match à venir.
    if (!pm) {
      if (isUpcoming(nm)) {
        alerts.push({
          kind: 'new_match',
          matchId: nm.id,
          message: `Nouveau match — ${matchSummary(nm, teamId)}`,
        })
      }
      continue
    }

    // Forfait adverse : le match devient un forfait dont l'équipe suivie n'est pas
    // le côté forfaitaire → elle l'emporte 3–0.
    if (nm.status === 'forfeit' && pm.status !== 'forfeit') {
      if (nm.forfeitSide && nm.forfeitSide !== sideOf(nm, teamId)) {
        alerts.push({
          kind: 'opponent_forfeit',
          matchId: nm.id,
          message: `Forfait de ${opponentName(nm, teamId)} — vous l'emportez 3–0.`,
        })
      }
      continue
    }

    // Décalage / changement de terrain (uniquement sur un match encore à venir).
    if (isUpcoming(nm)) {
      if (nm.time !== pm.time) {
        alerts.push({
          kind: 'rescheduled',
          matchId: nm.id,
          message: `Match décalé — ${matchSummary(nm, teamId)}`,
        })
      } else if (nm.terrainNumber !== pm.terrainNumber) {
        alerts.push({
          kind: 'terrain',
          matchId: nm.id,
          message: `Changement de terrain — ${matchSummary(nm, teamId)}`,
        })
      }
    }
  }

  return alerts
}
