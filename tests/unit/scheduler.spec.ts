import { test } from '@japa/runner'
import { generateSchedule, generateRoundRobin, SchedulerError } from '#services/scheduler/index'
import type { SchedulerParams, Schedule } from '#services/scheduler/index'

function teams(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1)
}

function baseParams(teamIds: number[], overrides: Partial<SchedulerParams> = {}): SchedulerParams {
  return {
    teamIds,
    numTerrains: 2,
    startTime: '09:00',
    matchDurationMin: 10,
    breakDurationMin: 2,
    lunchStart: null,
    lunchDurationMin: 0,
    ...overrides,
  }
}

function key(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/**
 * Vérifie l'intégralité des contraintes dures sur un planning généré.
 */
function assertValidSchedule(assert: any, params: SchedulerParams, schedule: Schedule) {
  const ids = params.teamIds
  const n = ids.length

  // --- Tous les appariements du round-robin, chacun exactement une fois ---
  const expected = new Set<string>()
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) expected.add(key(ids[i], ids[j]))
  }
  assert.equal(schedule.matches.length, (n * (n - 1)) / 2, 'nombre de matchs = C(N,2)')

  const seen = new Set<string>()
  for (const m of schedule.matches) {
    const k = key(m.homeTeamId, m.awayTeamId)
    assert.isFalse(seen.has(k), `appariement ${k} en double`)
    assert.isTrue(expected.has(k), `appariement ${k} inattendu`)
    assert.notEqual(m.homeTeamId, m.awayTeamId, 'une équipe ne joue pas contre elle-même')
    seen.add(k)
  }
  assert.equal(seen.size, expected.size, 'tous les appariements sont présents')

  // --- Regroupement par créneau ---
  const teamsBySlot = new Map<number, number[]>()
  const terrainsBySlot = new Map<number, Set<number>>()
  for (const m of schedule.matches) {
    assert.isAbove(m.terrainNumber, 0)
    assert.isAtMost(m.terrainNumber, params.numTerrains, 'terrain dans la limite')

    const arr = teamsBySlot.get(m.slotIndex) ?? []
    arr.push(m.homeTeamId, m.awayTeamId)
    teamsBySlot.set(m.slotIndex, arr)

    const terr = terrainsBySlot.get(m.slotIndex) ?? new Set<number>()
    assert.isFalse(terr.has(m.terrainNumber), `terrain ${m.terrainNumber} utilisé 2x au créneau ${m.slotIndex}`)
    terr.add(m.terrainNumber)
    terrainsBySlot.set(m.slotIndex, terr)
  }

  // --- Au plus numTerrains matchs par créneau + pas d'équipe en parallèle ---
  for (const [slot, arr] of teamsBySlot) {
    assert.isAtMost(arr.length / 2, params.numTerrains, `≤ ${params.numTerrains} matchs au créneau ${slot}`)
    assert.equal(new Set(arr).size, arr.length, `aucune équipe en double au créneau ${slot}`)
  }

  // --- Aucune équipe sur deux créneaux consécutifs (repos obligatoire) ---
  const teamSetBySlot = new Map<number, Set<number>>()
  for (const [slot, arr] of teamsBySlot) teamSetBySlot.set(slot, new Set(arr))
  for (const slot of teamSetBySlot.keys()) {
    const cur = teamSetBySlot.get(slot)!
    const next = teamSetBySlot.get(slot + 1)
    if (!next) continue
    for (const t of cur) {
      assert.isFalse(next.has(t), `équipe ${t} joue les créneaux consécutifs ${slot} et ${slot + 1}`)
    }
  }
}

test.group('scheduler · round-robin (appariements)', () => {
  test('N pair : chaque équipe rencontre chaque autre une fois, N-1 journées', ({ assert }) => {
    const ids = teams(6)
    const pairings = generateRoundRobin(ids)
    assert.equal(pairings.length, 15) // C(6,2)
    const rounds = new Set(pairings.map((p) => p.roundNumber))
    assert.equal(rounds.size, 5) // N-1

    const seen = new Set<string>()
    for (const p of pairings) seen.add(key(p.homeTeamId, p.awayTeamId))
    assert.equal(seen.size, 15)
  })

  test('N impair : C(N,2) matchs, N journées (bye tournant)', ({ assert }) => {
    const ids = teams(5)
    const pairings = generateRoundRobin(ids)
    assert.equal(pairings.length, 10) // C(5,2)
    const rounds = new Set(pairings.map((p) => p.roundNumber))
    assert.equal(rounds.size, 5) // N
    // aucune référence au bye (-1)
    for (const p of pairings) {
      assert.isAbove(p.homeTeamId, 0)
      assert.isAbove(p.awayTeamId, 0)
    }
  })

  test('chaque journée : une équipe joue au plus une fois', ({ assert }) => {
    for (const n of [4, 5, 8, 9]) {
      const pairings = generateRoundRobin(teams(n))
      const byRound = new Map<number, number[]>()
      for (const p of pairings) {
        const arr = byRound.get(p.roundNumber) ?? []
        arr.push(p.homeTeamId, p.awayTeamId)
        byRound.set(p.roundNumber, arr)
      }
      for (const [round, arr] of byRound) {
        assert.equal(new Set(arr).size, arr.length, `N=${n} journée ${round}`)
      }
    }
  })
})

test.group('scheduler · planning complet (contraintes dures)', () => {
  test('toutes les combinaisons N × terrains respectent les contraintes', ({ assert }) => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const numTerrains of [1, 2, 3, 4]) {
        const params = baseParams(teams(n), { numTerrains })
        const schedule = generateSchedule(params)
        assertValidSchedule(assert, params, schedule)
      }
    }
  })

  test('1 terrain : au plus un match par créneau', ({ assert }) => {
    const params = baseParams(teams(6), { numTerrains: 1 })
    const schedule = generateSchedule(params)
    assertValidSchedule(assert, params, schedule)

    const perSlot = new Map<number, number>()
    for (const m of schedule.matches) perSlot.set(m.slotIndex, (perSlot.get(m.slotIndex) ?? 0) + 1)
    for (const count of perSlot.values()) assert.equal(count, 1)
  })

  test('plusieurs terrains : des matchs se jouent en parallèle', ({ assert }) => {
    const params = baseParams(teams(8), { numTerrains: 3 })
    const schedule = generateSchedule(params)
    assertValidSchedule(assert, params, schedule)

    const perSlot = new Map<number, number>()
    for (const m of schedule.matches) perSlot.set(m.slotIndex, (perSlot.get(m.slotIndex) ?? 0) + 1)
    assert.isTrue([...perSlot.values()].some((c) => c > 1), 'au moins un créneau avec 2+ matchs')
  })
})

test.group('scheduler · horaires', () => {
  test('le premier match commence à l’heure de début', ({ assert }) => {
    const params = baseParams(teams(6), { startTime: '09:00', numTerrains: 2 })
    const schedule = generateSchedule(params)
    const first = Math.min(...schedule.matches.map((m) => m.startsAtMinutes))
    assert.equal(first, 9 * 60)
    assert.isTrue(schedule.matches.some((m) => m.startTime === '09:00'))
  })

  test('durée d’un créneau = durée match + pause (créneaux de repos compris)', ({ assert }) => {
    const params = baseParams(teams(6), {
      numTerrains: 2,
      matchDurationMin: 15,
      breakDurationMin: 5,
    })
    const startMinutes = 9 * 60
    const slotDuration = 15 + 5
    const schedule = generateSchedule(params)
    // Sans pause déjeuner, chaque créneau s démarre à start + s × durée-créneau,
    // y compris les créneaux de repos (qui « sautent » un créneau occupé).
    for (const m of schedule.matches) {
      assert.equal(
        m.startsAtMinutes,
        startMinutes + m.slotIndex * slotDuration,
        `créneau ${m.slotIndex} mal positionné dans le temps`
      )
    }
  })
})

test.group('scheduler · pause déjeuner', () => {
  test('aucun match ne démarre pendant la pause déjeuner, et elle décale bien le planning', ({
    assert,
  }) => {
    const teamIds = teams(6)
    const common = { numTerrains: 1, matchDurationMin: 30, breakDurationMin: 0, startTime: '09:00' }
    const lunchStart = 12 * 60
    const lunchEnd = 13 * 60

    // Sans pause : au moins un match tomberait dans la fenêtre du déjeuner.
    const without = generateSchedule(baseParams(teamIds, common))
    assert.isTrue(
      without.matches.some((m) => m.startsAtMinutes >= lunchStart && m.startsAtMinutes < lunchEnd),
      'sans pause, un match démarrerait entre 12:00 et 13:00'
    )

    // Avec pause : aucun match ne démarre dans la fenêtre.
    const withLunch = generateSchedule(
      baseParams(teamIds, { ...common, lunchStart: '12:00', lunchDurationMin: 60 })
    )
    assertValidSchedule(assert, baseParams(teamIds, { ...common }), withLunch)
    for (const m of withLunch.matches) {
      assert.isFalse(
        m.startsAtMinutes >= lunchStart && m.startsAtMinutes < lunchEnd,
        `un match démarre à ${m.startTime} pendant la pause déjeuner`
      )
    }
    assert.isTrue(
      withLunch.matches.some((m) => m.startsAtMinutes >= lunchEnd),
      'des matchs ont lieu après la pause'
    )
  })
})

test.group('scheduler · entrées invalides', () => {
  test('moins de 2 équipes → erreur explicite', ({ assert }) => {
    assert.throws(() => generateSchedule(baseParams(teams(1))), SchedulerError)
    assert.throws(() => generateSchedule(baseParams([])), SchedulerError)
  })

  test('0 terrain → erreur explicite', ({ assert }) => {
    assert.throws(() => generateSchedule(baseParams(teams(4), { numTerrains: 0 })), SchedulerError)
  })

  test('équipes en double → erreur explicite', ({ assert }) => {
    assert.throws(() => generateSchedule(baseParams([1, 2, 2, 3])), SchedulerError)
  })

  test('durée de match nulle → erreur explicite', ({ assert }) => {
    assert.throws(
      () => generateSchedule(baseParams(teams(4), { matchDurationMin: 0 })),
      SchedulerError
    )
  })
})
