import { SchedulerError } from './errors.js'

/**
 * Horaires de créneaux — moteur **pur** (aucune dépendance DB). Extrait pour être
 * réutilisé par le placement inter-catégories (événements v2, #32) : une grille
 * partagée par plusieurs catégories doit recevoir **une seule** passe d'horaires
 * (rythme + pause déjeuner cohérents sur toute la journée).
 */

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

/** "HH:mm" → minutes depuis minuit. */
export function parseTimeToMinutes(t: string): number {
  const m = TIME_REGEX.exec(t)
  if (!m) throw new SchedulerError(`Heure invalide : « ${t} » (format attendu HH:mm).`)
  return Number(m[1]) * 60 + Number(m[2])
}

/** Minutes depuis minuit → "HH:mm". */
export function minutesToTime(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const mm = total % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Paramètres horaires d'une journée (indépendants du format / des équipes). */
export interface SlotTiming {
  /** Heure de début "HH:mm". */
  startTime: string
  /** Durée d'un match en minutes. */
  matchDurationMin: number
  /** Pause entre matchs en minutes. */
  breakDurationMin: number
  /** Début de la pause déjeuner "HH:mm", ou null/absent. */
  lunchStart?: string | null
  /** Durée de la pause déjeuner en minutes (par défaut 0). */
  lunchDurationMin?: number
}

/**
 * Heure de début (en minutes) de chaque créneau `0..slotsCount-1`, avec insertion
 * de la pause déjeuner au premier créneau qui atteint l'heure de déjeuner. Logique
 * identique à celle des plannings mono-catégorie, pour un rendu cohérent.
 */
export function assignSlotTimes(slotsCount: number, timing: SlotTiming): number[] {
  const startMinutes = parseTimeToMinutes(timing.startTime)
  const lunchStartMinutes = timing.lunchStart ? parseTimeToMinutes(timing.lunchStart) : null
  const lunchDurationMin = timing.lunchDurationMin ?? 0
  const slotDuration = timing.matchDurationMin + timing.breakDurationMin

  const slotStart: number[] = new Array(slotsCount)
  let clock = startMinutes
  let lunchInserted = false
  for (let s = 0; s < slotsCount; s++) {
    if (
      lunchStartMinutes !== null &&
      lunchDurationMin > 0 &&
      !lunchInserted &&
      lunchStartMinutes >= startMinutes &&
      clock >= lunchStartMinutes
    ) {
      clock += lunchDurationMin
      lunchInserted = true
    }
    slotStart[s] = clock
    clock += slotDuration
  }
  return slotStart
}
