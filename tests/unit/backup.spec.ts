import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  backupFileName,
  isBackupFile,
  backupsToPrune,
  pgDumpArgs,
  pgRestoreArgs,
} from '#services/backup'

/**
 * Sauvegardes PostgreSQL (issue #119) — cœur pur (noms de fichiers, rétention,
 * arguments pg_dump/pg_restore). Aucune I/O, aucune dépendance DB.
 */

const CONN = { host: '127.0.0.1', port: 5432, user: 'fixtura', database: 'fixtura' }

test.group('backup · noms de fichiers', () => {
  test('nom horodaté en UTC', ({ assert }) => {
    assert.equal(backupFileName(DateTime.utc(2026, 8, 11, 3, 5, 9)), 'fixtura-20260811-030509.dump')
    // Une heure locale est ramenée en UTC.
    assert.equal(
      backupFileName(DateTime.fromISO('2026-08-11T05:05:09+02:00')),
      'fixtura-20260811-030509.dump'
    )
  })

  test('reconnaissance d’un fichier de sauvegarde', ({ assert }) => {
    assert.isTrue(isBackupFile('fixtura-20260811-030509.dump'))
    assert.isFalse(isBackupFile('fixtura-20260811.dump')) // horodatage incomplet
    assert.isFalse(isBackupFile('autre.dump'))
    assert.isFalse(isBackupFile('fixtura-20260811-030509.sql'))
  })
})

test.group('backup · rétention', () => {
  const files = [
    'fixtura-20260801-030000.dump',
    'fixtura-20260803-030000.dump',
    'fixtura-20260802-030000.dump',
    'fixtura-20260804-030000.dump',
  ]

  test('conserve les N plus récentes, supprime le reste', ({ assert }) => {
    const prune = backupsToPrune(files, 2)
    // On garde les 2 plus récentes (04, 03) → on supprime les 2 plus anciennes (02, 01).
    assert.deepEqual(prune.sort(), ['fixtura-20260801-030000.dump', 'fixtura-20260802-030000.dump'])
  })

  test('rien à supprimer si le total est ≤ N', ({ assert }) => {
    assert.deepEqual(backupsToPrune(files, 10), [])
  })

  test('ignore les fichiers non reconnus (jamais supprimés)', ({ assert }) => {
    const withNoise = [...files, 'README.md', 'fixtura.sql', '.keep']
    const prune = backupsToPrune(withNoise, 2)
    assert.notInclude(prune, 'README.md')
    assert.notInclude(prune, 'fixtura.sql')
    assert.lengthOf(prune, 2)
  })

  test('keep <= 0 supprime toutes les sauvegardes', ({ assert }) => {
    assert.lengthOf(backupsToPrune(files, 0), 4)
  })
})

test.group('backup · arguments pg_dump / pg_restore', () => {
  test('pg_dump : format custom vers le fichier de sortie', ({ assert }) => {
    const a = pgDumpArgs(CONN, '/backups/x.dump')
    assert.includeMembers(a, ['-h', '127.0.0.1', '-p', '5432', '-U', 'fixtura', '-d', 'fixtura'])
    assert.include(a, '-Fc')
    assert.include(a, '--no-owner')
    // Le dernier couple cible le fichier.
    assert.deepEqual(a.slice(-2), ['-f', '/backups/x.dump'])
  })

  test('pg_restore : restauration propre (--clean --if-exists)', ({ assert }) => {
    const a = pgRestoreArgs(CONN, '/backups/x.dump')
    assert.include(a, '--clean')
    assert.include(a, '--if-exists')
    assert.include(a, '--no-owner')
    assert.equal(a[a.length - 1], '/backups/x.dump') // le dump en dernier argument
  })
})
