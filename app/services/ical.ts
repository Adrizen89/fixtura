import type { DateTime } from 'luxon'
import type Match from '#models/match'
import type Tournament from '#models/tournament'
import { participantLabel, bracketRoundShort } from '#services/match_labels'

/**
 * Génération iCalendar (RFC 5545) — export du planning d'un tournoi (issue #121).
 *
 * Module (quasi) pur : aucune requête DB. La construction du `.ics` à partir de
 * structures simples (`buildIcalCalendar`) est **entièrement testable** ; le pont
 * `tournamentCalendar` mappe des modèles **déjà chargés** (matchs + équipes
 * préchargées) vers ces structures, sans I/O.
 *
 * La MÊME URL publique (slug non devinable) sert deux usages :
 *  - **téléchargement** d'un fichier `.ics` (import ponctuel dans l'agenda) ;
 *  - **abonnement** calendrier : l'appli cliente repolle l'URL → planning tenu à
 *    jour (décalages, scores) sans action de l'utilisateur.
 *
 * Horaires : le planning est stocké en « heure murale » (cf. `planning.ts`, qui
 * lit toujours via `.toUTC()`). On émet donc `DTSTART`/`DTEND` en heure
 * **flottante** (sans `Z` ni fuseau) : un match à 09:00 s'affiche à 09:00 pour
 * tout le monde — le bon comportement pour un évènement physique sur site. Les
 * horodatages absolus (`DTSTAMP`, `LAST-MODIFIED`) restent en UTC.
 */

/** Un évènement de calendrier (un match). */
export interface IcalEvent {
  /** Identifiant stable et unique de l'évènement (RFC 5545 `UID`). */
  uid: string
  /** Début — heure murale, sérialisée en temps flottant. */
  start: DateTime
  /** Fin (début + durée du match) — heure murale. */
  end: DateTime
  summary: string
  location?: string | null
  description?: string | null
  /** `CONFIRMED` (défaut) ou `CANCELLED`. */
  status?: 'CONFIRMED' | 'CANCELLED'
  /** Dernière modification (UTC) — aide les clients à détecter les mises à jour. */
  lastModified?: DateTime | null
}

/** Un calendrier iCal complet. */
export interface IcalCalendar {
  /** Nom affiché du calendrier (`X-WR-CALNAME` / `NAME`). */
  name: string
  events: IcalEvent[]
  /** Horodatage de génération (`DTSTAMP`) — injecté pour la pureté/testabilité. */
  now: DateTime
  /** Intervalle de rafraîchissement suggéré aux clients d'abonnement (minutes). */
  refreshMinutes?: number
}

const PRODID = '-//ADBDigital//Fixtura//FR'

/** Échappe un texte pour une valeur iCal (RFC 5545 §3.3.11). */
export function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n')
}

/** Date absolue en UTC « basique » iCal : `20260809T093000Z`. */
export function formatICalUtc(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")
}

/** Heure murale (flottante, sans `Z`) : `20260809T090000`. */
export function formatICalFloating(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss")
}

/**
 * Plie une ligne de contenu à 75 octets (RFC 5545 §3.1) : les continuations
 * commencent par une espace. On compte en **octets UTF-8** et on ne coupe jamais
 * un caractère multi-octets en son milieu.
 */
export function foldICalLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  let first = true
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length
    // 75 octets pour la 1re ligne ; 74 pour les suivantes (l'espace de pli compte).
    const limit = first ? 75 : 74
    if (currentBytes + chBytes > limit) {
      parts.push(current)
      current = ''
      currentBytes = 0
      first = false
    }
    current += ch
    currentBytes += chBytes
  }
  parts.push(current)
  return parts.map((p, i) => (i === 0 ? p : ` ${p}`)).join('\r\n')
}

/** Une ligne `NOM:valeur`, pliée si nécessaire. */
function contentLine(name: string, value: string): string {
  return foldICalLine(`${name}:${value}`)
}

/**
 * Sérialise un calendrier au format iCalendar (RFC 5545). Lignes en `CRLF`,
 * évènements ordonnés tels que fournis. Fonction **pure** (aucune I/O).
 */
export function buildIcalCalendar(cal: IcalCalendar): string {
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0']
  lines.push(`PRODID:${PRODID}`)
  lines.push('CALSCALE:GREGORIAN', 'METHOD:PUBLISH')
  lines.push(contentLine('X-WR-CALNAME', escapeICalText(cal.name)))
  lines.push(contentLine('NAME', escapeICalText(cal.name)))
  if (cal.refreshMinutes && cal.refreshMinutes > 0) {
    // Indices de rafraîchissement pour les clients d'abonnement (RFC 7986 + Apple).
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${cal.refreshMinutes}M`)
    lines.push(`X-PUBLISHED-TTL:PT${cal.refreshMinutes}M`)
  }

  const stamp = formatICalUtc(cal.now)
  for (const ev of cal.events) {
    lines.push('BEGIN:VEVENT')
    lines.push(contentLine('UID', ev.uid))
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${formatICalFloating(ev.start)}`)
    lines.push(`DTEND:${formatICalFloating(ev.end)}`)
    lines.push(contentLine('SUMMARY', escapeICalText(ev.summary)))
    if (ev.location) lines.push(contentLine('LOCATION', escapeICalText(ev.location)))
    if (ev.description) lines.push(contentLine('DESCRIPTION', escapeICalText(ev.description)))
    lines.push(`STATUS:${ev.status ?? 'CONFIRMED'}`)
    if (ev.lastModified) lines.push(`LAST-MODIFIED:${formatICalUtc(ev.lastModified)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

/** Libellé court de la phase d'un match (« Poule A », « Quart #1 », « Journée 3 »). */
function phaseLabel(m: Match): string {
  if (m.stage === 'pool' && m.groupLabel) return `Poule ${m.groupLabel}`
  if (m.stage === 'knockout') {
    const slot = m.bracketSlot !== null ? ` #${m.bracketSlot + 1}` : ''
    return `${bracketRoundShort(m.bracketRound)}${slot}`
  }
  return `Journée ${m.roundNumber}`
}

/**
 * Convertit un tournoi + ses matchs (modèles **déjà chargés**, équipes
 * préchargées) en `IcalCalendar`. Les participants différés (slot de bracket non
 * résolu) sont nommés via `participantLabel` — jamais déréférencés. Le score est
 * intégré au titre quand le match est terminé.
 *
 * @param origin Origine absolue (`https://host`) pour un lien retour dans la
 *   description ; optionnel.
 */
export function tournamentCalendar(
  tournament: Tournament,
  matches: Match[],
  now: DateTime,
  origin?: string
): IcalCalendar {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const durationMin = tournament.matchDurationMin
  const publicUrl = origin ? `${origin.replace(/\/+$/, '')}/t/${tournament.publicSlug}` : null

  const events: IcalEvent[] = matches.map((m) => {
    const home = participantLabel(m, 'home', byId)
    const away = participantLabel(m, 'away', byId)
    const settled = m.status === 'finished' || m.status === 'forfeit'
    const hasScore = settled && m.homeScore !== null && m.awayScore !== null

    // Titre : « A 3–1 B » si terminé, sinon « A – B » ; « (forfait) » le cas échéant.
    const core = hasScore ? `${home} ${m.homeScore}–${m.awayScore} ${away}` : `${home} – ${away}`
    const summary = m.status === 'forfeit' ? `${core} (forfait)` : core

    const descriptionParts = [phaseLabel(m)]
    if (publicUrl) descriptionParts.push(publicUrl)

    return {
      uid: `fixtura-match-${m.id}@fixtura.fr`,
      start: m.scheduledAt,
      end: m.scheduledAt.plus({ minutes: durationMin }),
      summary,
      location: `Terrain ${m.terrainNumber}`,
      description: descriptionParts.join('\n'),
      lastModified: m.updatedAt ?? tournament.updatedAt ?? null,
    }
  })

  return {
    name: `${tournament.name} — ${tournament.category}`,
    events,
    now,
    refreshMinutes: 15,
  }
}

/** Nom de fichier `.ics` sûr pour un tournoi (slug non devinable). */
export function icsFileName(tournament: Tournament): string {
  return `tournoi-${tournament.publicSlug}.ics`
}
