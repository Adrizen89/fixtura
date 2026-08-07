import { test } from '@japa/runner'
import { assignSlotTimes, minutesToTime, parseTimeToMinutes } from '#services/scheduler/timing'
import { SchedulerError } from '#services/scheduler/index'

/**
 * Horaires de créneaux partagés (#32) — extraits pour la grille combinée d'un
 * événement. Une seule passe d'horaires ⇒ rythme + pause déjeuner cohérents pour
 * toutes les catégories.
 */
test.group('scheduler · assignSlotTimes', () => {
  test('espace les créneaux de (durée match + pause)', ({ assert }) => {
    const starts = assignSlotTimes(4, {
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
    })
    assert.deepEqual(starts.map(minutesToTime), ['09:00', '09:12', '09:24', '09:36'])
  })

  test('insère la pause déjeuner au premier créneau qui l’atteint', ({ assert }) => {
    // Créneaux de 30 min à partir de 12:00 : 12:00, 12:30, puis pause 12:45 (45 min)…
    const starts = assignSlotTimes(4, {
      startTime: '12:00',
      matchDurationMin: 20,
      breakDurationMin: 10,
      lunchStart: '12:45',
      lunchDurationMin: 45,
    })
    // 12:00 ; 12:30 ; (12:45 atteint → +45) 13:45 ; 14:15
    assert.deepEqual(starts.map(minutesToTime), ['12:00', '12:30', '13:45', '14:15'])
  })

  test('sans pause déjeuner, aucun décalage', ({ assert }) => {
    const starts = assignSlotTimes(3, {
      startTime: '09:00',
      matchDurationMin: 15,
      breakDurationMin: 0,
      lunchStart: null,
      lunchDurationMin: 0,
    })
    assert.deepEqual(starts.map(minutesToTime), ['09:00', '09:15', '09:30'])
  })

  test('rejette une heure invalide', ({ assert }) => {
    assert.throws(() => parseTimeToMinutes('25:00'), SchedulerError)
    assert.throws(() => parseTimeToMinutes('9h00'), SchedulerError)
  })
})
