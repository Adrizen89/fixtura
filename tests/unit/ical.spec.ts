import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type Match from '#models/match'
import type Tournament from '#models/tournament'
import {
  escapeICalText,
  formatICalUtc,
  formatICalFloating,
  foldICalLine,
  buildIcalCalendar,
  tournamentCalendar,
  icsFileName,
  type IcalCalendar,
} from '#services/ical'

/**
 * Génération iCalendar (issue #121) — logique pure (aucune dépendance HTTP/DB).
 */

const NOW = DateTime.utc(2026, 8, 1, 12, 0, 0)

/** Extrait les lignes « dépliées » (RFC 5545 : une continuation commence par ' '). */
function unfold(ics: string): string[] {
  return ics
    .split('\r\n')
    .reduce<string[]>((acc, l) => {
      if (l.startsWith(' ') && acc.length) acc[acc.length - 1] += l.slice(1)
      else acc.push(l)
      return acc
    }, [])
    .filter((l) => l.length > 0)
}

test.group('ical · échappement & formats', () => {
  test('escapeICalText échappe \\ ; , et les retours à la ligne', ({ assert }) => {
    assert.equal(escapeICalText('A; B, C\\D'), 'A\\; B\\, C\\\\D')
    assert.equal(escapeICalText('ligne1\nligne2'), 'ligne1\\nligne2')
    assert.equal(escapeICalText('crlf\r\nici'), 'crlf\\nici')
  })

  test('formatICalUtc sérialise en UTC basique avec Z', ({ assert }) => {
    assert.equal(formatICalUtc(DateTime.utc(2026, 8, 9, 9, 30, 0)), '20260809T093000Z')
    // Une date avec fuseau est ramenée en UTC.
    assert.equal(formatICalUtc(DateTime.fromISO('2026-08-09T11:30:00+02:00')), '20260809T093000Z')
  })

  test('formatICalFloating sérialise l’heure murale sans Z', ({ assert }) => {
    assert.equal(formatICalFloating(DateTime.utc(2026, 8, 9, 9, 0, 0)), '20260809T090000')
  })
})

test.group('ical · pliage des lignes (RFC 5545 §3.1)', () => {
  test('une ligne courte reste inchangée', ({ assert }) => {
    assert.equal(foldICalLine('SUMMARY:court'), 'SUMMARY:court')
  })

  test('une ligne longue est pliée à ≤ 75 octets, continuations préfixées d’une espace', ({
    assert,
  }) => {
    const long = `SUMMARY:${'x'.repeat(200)}`
    const folded = foldICalLine(long)
    const physical = folded.split('\r\n')
    assert.isAbove(physical.length, 1)
    for (const l of physical) {
      assert.isAtMost(new TextEncoder().encode(l).length, 75)
    }
    // Toutes les continuations commencent par une espace.
    for (const l of physical.slice(1)) assert.match(l, /^ /)
    // Le dépliage reconstitue la ligne d’origine.
    const rejoined = physical.map((l, i) => (i === 0 ? l : l.slice(1))).join('')
    assert.equal(rejoined, long)
  })
})

test.group('ical · buildIcalCalendar', () => {
  function sampleCalendar(): IcalCalendar {
    return {
      name: 'Tournoi de Pâques — U11',
      now: NOW,
      refreshMinutes: 15,
      events: [
        {
          uid: 'match-1@fixtura.fr',
          start: DateTime.utc(2026, 8, 9, 9, 0, 0),
          end: DateTime.utc(2026, 8, 9, 9, 15, 0),
          summary: 'Les Aigles – Les Lions',
          location: 'Terrain 1',
          description: 'Journée 1',
          lastModified: DateTime.utc(2026, 8, 8, 18, 0, 0),
        },
        {
          uid: 'match-2@fixtura.fr',
          start: DateTime.utc(2026, 8, 9, 9, 20, 0),
          end: DateTime.utc(2026, 8, 9, 9, 35, 0),
          summary: 'Les Aigles 3–0 Les Lions (forfait)',
          location: 'Terrain 2',
          status: 'CANCELLED',
        },
      ],
    }
  }

  test('enveloppe VCALENDAR valide, en-têtes et CRLF', ({ assert }) => {
    const ics = buildIcalCalendar(sampleCalendar())
    assert.isTrue(ics.startsWith('BEGIN:VCALENDAR\r\n'))
    assert.isTrue(ics.endsWith('END:VCALENDAR\r\n'))
    const lines = unfold(ics)
    assert.include(lines, 'VERSION:2.0')
    assert.include(lines, 'PRODID:-//ADBDigital//Fixtura//FR')
    assert.include(lines, 'CALSCALE:GREGORIAN')
    assert.include(lines, 'X-WR-CALNAME:Tournoi de Pâques — U11')
    assert.include(lines, 'REFRESH-INTERVAL;VALUE=DURATION:PT15M')
  })

  test('un VEVENT par évènement, avec DTSTART flottant et DTSTAMP en UTC', ({ assert }) => {
    const ics = buildIcalCalendar(sampleCalendar())
    const lines = unfold(ics)
    assert.lengthOf(
      lines.filter((l) => l === 'BEGIN:VEVENT'),
      2
    )
    assert.include(lines, 'UID:match-1@fixtura.fr')
    assert.include(lines, 'DTSTAMP:20260801T120000Z') // now, absolu (Z)
    assert.include(lines, 'DTSTART:20260809T090000') // heure murale (sans Z)
    assert.include(lines, 'DTEND:20260809T091500')
    assert.include(lines, 'LOCATION:Terrain 1')
    assert.include(lines, 'LAST-MODIFIED:20260808T180000Z')
  })

  test('STATUS : CONFIRMED par défaut, CANCELLED si fourni', ({ assert }) => {
    const lines = unfold(buildIcalCalendar(sampleCalendar()))
    assert.equal(lines.filter((l) => l === 'STATUS:CONFIRMED').length, 1)
    assert.equal(lines.filter((l) => l === 'STATUS:CANCELLED').length, 1)
  })

  test('les caractères spéciaux du titre sont échappés', ({ assert }) => {
    const ics = buildIcalCalendar({
      name: 'Cal',
      now: NOW,
      events: [
        {
          uid: 'x@fixtura.fr',
          start: DateTime.utc(2026, 8, 9, 9, 0, 0),
          end: DateTime.utc(2026, 8, 9, 9, 15, 0),
          summary: 'A, B; C',
        },
      ],
    })
    assert.include(unfold(ics), 'SUMMARY:A\\, B\\; C')
  })
})

test.group('ical · tournamentCalendar (mapping)', () => {
  const tournament = {
    name: 'Tournoi de Pâques',
    category: 'U11',
    publicSlug: 'abc-123',
    matchDurationMin: 15,
    updatedAt: DateTime.utc(2026, 8, 8, 10, 0, 0),
  } as unknown as Tournament

  /** Construit un faux Match minimal (équipes connues) pour `participantLabel`. */
  function fakeMatch(p: Partial<Match> & { id: number }): Match {
    return {
      roundNumber: 1,
      terrainNumber: 1,
      scheduledAt: DateTime.utc(2026, 8, 9, 9, 0, 0),
      homeTeamId: 1,
      awayTeamId: 2,
      homeTeam: { name: 'Les Aigles' },
      awayTeam: { name: 'Les Lions' },
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      stage: 'main',
      groupLabel: null,
      bracketRound: null,
      bracketSlot: null,
      homeSourceType: null,
      awaySourceType: null,
      homeSourceMatchId: null,
      awaySourceMatchId: null,
      homeSourcePool: null,
      awaySourcePool: null,
      homeSourceRank: null,
      awaySourceRank: null,
      homeSourceIndex: null,
      awaySourceIndex: null,
      updatedAt: DateTime.utc(2026, 8, 9, 8, 0, 0),
      ...p,
    } as unknown as Match
  }

  test('nom du calendrier = « nom — catégorie », durée appliquée à DTEND', ({ assert }) => {
    const cal = tournamentCalendar(tournament, [fakeMatch({ id: 1 })], NOW)
    assert.equal(cal.name, 'Tournoi de Pâques — U11')
    assert.equal(cal.events.length, 1)
    const ev = cal.events[0]
    assert.equal(ev.uid, 'fixtura-match-1@fixtura.fr')
    assert.equal(ev.location, 'Terrain 1')
    assert.equal(ev.summary, 'Les Aigles – Les Lions')
    // Début 09:00 + 15 min = 09:15.
    assert.equal(formatICalFloating(ev.end), '20260809T091500')
  })

  test('un match terminé intègre le score au titre', ({ assert }) => {
    const cal = tournamentCalendar(
      tournament,
      [fakeMatch({ id: 2, status: 'finished', homeScore: 3, awayScore: 1 })],
      NOW
    )
    assert.equal(cal.events[0].summary, 'Les Aigles 3–1 Les Lions')
  })

  test('un forfait est annoté « (forfait) »', ({ assert }) => {
    const cal = tournamentCalendar(
      tournament,
      [fakeMatch({ id: 3, status: 'forfeit', homeScore: 3, awayScore: 0 })],
      NOW
    )
    assert.equal(cal.events[0].summary, 'Les Aigles 3–0 Les Lions (forfait)')
  })

  test('la description inclut la phase et le lien public quand une origine est fournie', ({
    assert,
  }) => {
    const cal = tournamentCalendar(
      tournament,
      [fakeMatch({ id: 4, stage: 'pool', groupLabel: 'A' })],
      NOW,
      'https://fixtura.fr'
    )
    assert.equal(cal.events[0].description, 'Poule A\nhttps://fixtura.fr/t/abc-123')
  })

  test('icsFileName dérive du slug non devinable', ({ assert }) => {
    assert.equal(icsFileName(tournament), 'tournoi-abc-123.ics')
  })
})
