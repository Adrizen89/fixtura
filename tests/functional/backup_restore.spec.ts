import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { promisify } from 'node:util'
import { execFile as execFileCb } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import env from '#start/env'
import Club from '#models/club'
import { pgDumpArgs, pgRestoreArgs } from '#services/backup'

/**
 * Sauvegarde & restauration PostgreSQL (issue #119) — **restauration réelle testée**.
 *
 * On dump la base courante avec `pg_dump`, on restaure le dump dans une base
 * **temporaire neuve** avec `pg_restore`, puis on vérifie qu'une donnée distinctive
 * s'y retrouve. Prouve que le couple sauvegarde/restauration fonctionne de bout en
 * bout, sans toucher à la base de test. Nécessite `pg_dump`/`pg_restore`/`psql`
 * (présents en CI comme en prod, cf. `docs/backups.md`).
 */
const execFile = promisify(execFileCb)

test.group('Sauvegarde & restauration PostgreSQL (fonctionnel, réel)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('un dump est restauré dans une base neuve, données présentes', async ({ assert }) => {
    const conn = {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      database: env.get('DB_DATABASE'),
    }
    const password = env.get('DB_PASSWORD')
    const childEnv = password ? { ...process.env, PGPASSWORD: password } : process.env

    /** Exécute une requête SQL sur `database` via psql (sortie brute, une valeur). */
    const psql = (database: string, sql: string) =>
      execFile(
        'psql',
        ['-h', conn.host, '-p', String(conn.port), '-U', conn.user, '-d', database, '-tAc', sql],
        { env: childEnv }
      )

    // Donnée distinctive commitée dans la base courante (visible par pg_dump).
    const slug = `backup-probe-${process.pid}`
    await Club.create({ name: 'Club Sauvegarde', slug })

    const dumpPath = join(tmpdir(), `fixtura-test-${process.pid}.dump`)
    const tmpDb = `fixtura_restore_test_${process.pid}`
    assert.match(tmpDb, /^[a-z0-9_]+$/) // identifiant sûr (issu du PID)

    try {
      // 1. Sauvegarde de la base courante (format custom).
      await execFile('pg_dump', pgDumpArgs(conn, dumpPath), { env: childEnv })

      // 2. Base temporaire neuve.
      await psql(conn.database, `DROP DATABASE IF EXISTS ${tmpDb} WITH (FORCE)`)
      await psql(conn.database, `CREATE DATABASE ${tmpDb}`)

      // 3. Restauration réelle du dump dans la base temporaire.
      await execFile('pg_restore', pgRestoreArgs({ ...conn, database: tmpDb }, dumpPath), {
        env: childEnv,
      })

      // 4. La donnée distinctive est bien présente dans la base restaurée.
      const { stdout } = await psql(tmpDb, `SELECT name FROM clubs WHERE slug = '${slug}'`)
      assert.equal(stdout.trim(), 'Club Sauvegarde')
    } finally {
      await psql(conn.database, `DROP DATABASE IF EXISTS ${tmpDb} WITH (FORCE)`).catch(() => {})
      await unlink(dumpPath).catch(() => {})
    }
  })
})
