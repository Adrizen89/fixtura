import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * `node ace db:backup [--dir=chemin] [--keep=14]`
 *
 * Crée une sauvegarde horodatée de la base PostgreSQL (format custom `pg_dump -Fc`)
 * puis applique la **rétention** (ne conserve que les `--keep` plus récentes).
 * Pensée pour être **planifiée par cron** (cf. `docs/backups.md`, issue #119).
 *
 * Le dossier de sortie vient de `--dir`, sinon de `FIXTURA_BACKUP_DIR`, sinon
 * `~/fixtura-backups`. Déploiement/planification gérés par Adrien (cf. §11).
 */
export default class DbBackup extends BaseCommand {
  static commandName = 'db:backup'
  static description = 'Sauvegarder la base PostgreSQL (pg_dump) + appliquer la rétention'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Dossier de destination des sauvegardes', alias: 'd' })
  declare dir?: string

  @flags.number({ description: 'Nombre de sauvegardes à conserver (défaut 14)', alias: 'k' })
  declare keep?: number

  async run() {
    const os = await import('node:os')
    const { join } = await import('node:path')
    const { mkdir, readdir, unlink } = await import('node:fs/promises')
    const { promisify } = await import('node:util')
    const { execFile } = await import('node:child_process')
    const { DateTime } = await import('luxon')
    const { default: env } = await import('#start/env')
    const { backupFileName, backupsToPrune, pgDumpArgs } = await import('#services/backup')

    const run = promisify(execFile)

    const dir = this.dir ?? process.env.FIXTURA_BACKUP_DIR ?? join(os.homedir(), 'fixtura-backups')
    const keep = Number.isInteger(this.keep) ? this.keep! : 14

    const conn = {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      database: env.get('DB_DATABASE'),
    }
    const password = env.get('DB_PASSWORD')
    const childEnv = password ? { ...process.env, PGPASSWORD: password } : process.env

    await mkdir(dir, { recursive: true })
    const outPath = join(dir, backupFileName(DateTime.now()))

    try {
      await run('pg_dump', pgDumpArgs(conn, outPath), { env: childEnv })
    } catch (error) {
      this.logger.error(`Échec de pg_dump : ${error instanceof Error ? error.message : error}`)
      this.exitCode = 1
      return
    }
    this.logger.success(`Sauvegarde créée : ${outPath}`)

    // Rétention : supprimer les sauvegardes au-delà des `keep` plus récentes.
    const files = await readdir(dir)
    const toPrune = backupsToPrune(files, keep)
    for (const name of toPrune) {
      await unlink(join(dir, name))
    }
    if (toPrune.length > 0) {
      this.logger.info(`Rétention : ${toPrune.length} ancienne(s) sauvegarde(s) supprimée(s).`)
    }
  }
}
