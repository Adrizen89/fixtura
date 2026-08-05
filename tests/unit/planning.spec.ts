import { test } from '@japa/runner'
import { schedulerParamsFor, viewFromSchedule } from '#services/planning'
import type { Schedule } from '#services/scheduler/index'

test.group('planning · schedulerParamsFor', () => {
  test('ne garde que HH:mm des heures et recopie les paramètres', ({ assert }) => {
    const params = schedulerParamsFor(
      {
        numTerrains: 3,
        startTime: '09:00:00',
        matchDurationMin: 10,
        breakDurationMin: 2,
        lunchStart: '12:30:00',
        lunchDurationMin: 60,
      },
      [1, 2, 3]
    )

    assert.deepEqual(params, {
      teamIds: [1, 2, 3],
      numTerrains: 3,
      startTime: '09:00',
      matchDurationMin: 10,
      breakDurationMin: 2,
      lunchStart: '12:30',
      lunchDurationMin: 60,
    })
  })

  test('propage lunchStart null', ({ assert }) => {
    const params = schedulerParamsFor(
      {
        numTerrains: 1,
        startTime: '08:00',
        matchDurationMin: 15,
        breakDurationMin: 0,
        lunchStart: null,
        lunchDurationMin: 0,
      },
      [1, 2]
    )

    assert.isNull(params.lunchStart)
    assert.equal(params.startTime, '08:00')
  })
})

test.group('planning · viewFromSchedule', () => {
  const schedule: Schedule = {
    matches: [
      // Volontairement en désordre (terrain 2 avant 1) pour vérifier le tri.
      {
        roundNumber: 1,
        slotIndex: 0,
        terrainNumber: 2,
        startsAtMinutes: 540,
        startTime: '09:00',
        homeTeamId: 3,
        awayTeamId: 4,
      },
      {
        roundNumber: 1,
        slotIndex: 0,
        terrainNumber: 1,
        startsAtMinutes: 540,
        startTime: '09:00',
        homeTeamId: 1,
        awayTeamId: 2,
      },
      {
        roundNumber: 2,
        slotIndex: 1,
        terrainNumber: 1,
        startsAtMinutes: 552,
        startTime: '09:12',
        homeTeamId: 1,
        awayTeamId: 3,
      },
    ],
    slotsCount: 2,
    restSlots: 0,
    rounds: 2,
    endsAtMinutes: 562,
  }

  const names = new Map([
    [1, 'Alpha'],
    [2, 'Bravo'],
    [3, 'Charlie'],
    [4, 'Delta'],
  ])

  test('regroupe par créneau, trie les terrains et résout les noms', ({ assert }) => {
    const view = viewFromSchedule(schedule, names)

    assert.lengthOf(view.slots, 2)
    assert.equal(view.slots[0].time, '09:00')
    assert.lengthOf(view.slots[0].matches, 2)
    // Terrains triés croissants malgré l'ordre d'entrée.
    assert.equal(view.slots[0].matches[0].terrainNumber, 1)
    assert.equal(view.slots[0].matches[0].homeTeam, 'Alpha')
    assert.equal(view.slots[0].matches[0].awayTeam, 'Bravo')
    assert.equal(view.slots[0].matches[1].terrainNumber, 2)
    assert.equal(view.slots[1].time, '09:12')
  })

  test('calcule les compteurs et la plage horaire', ({ assert }) => {
    const view = viewFromSchedule(schedule, names)

    assert.equal(view.matchCount, 3)
    assert.equal(view.roundsCount, 2)
    assert.equal(view.slotsCount, 2)
    assert.equal(view.startTime, '09:00')
    assert.equal(view.endTime, '09:22')
  })

  test('affiche un identifiant de repli si un nom manque', ({ assert }) => {
    const view = viewFromSchedule(schedule, new Map())
    assert.equal(view.slots[0].matches[0].homeTeam, '#1')
  })
})
