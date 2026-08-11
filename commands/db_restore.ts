import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * `node ace db:restore <fichier> [--force] [--database=autre_base]`
 *
 * Restaure une sauvegarde PostgreSQL dans la base configurée (ou celle donnée par
 * `--database`, utile pour valider un dump sur une base de test). Opération
 * **destructrice** : `pg_restore --clean` supprime puis recrée les objets, donc une
 * confirmation est demandée (contournée par `--force`, pour cron / restauration
 * automatisée). Cf. `docs/backups.md` (issue #119).
 *
 * Accepte les dumps au **format custom** (`.dump`, `pg_restore`) et le **SQL simple**
 * (`.sql`, rejoué par `psql` — p. ex. le dump de pré-migration du déploiement).
 */
export default class DbRestore extends BaseCommand {
  static commandName = 'db:restore'
  static description = 'Restaurer une sauvegarde PostgreSQL (pg_restore / psql)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Chemin du fichier de sauvegarde (.dump ou .sql)' })
  declare file: string

  @flags.boolean({ description: 'Ne pas demander de confirmation', alias: 'f' })
  declare force: boolean

  @flags.string({ description: 'Base cible (défaut : la base configurée)' })
  declare database?: string

  async run() {
    const { access } = await import('node:fs/promises')
    const { promisify } = await import('node:util')
    const { execFile } = await import('node:child_process')
    const { default: env } = await import('#start/env')
    const { pgRestoreArgs } = await import('#services/backup')

    const run = promisify(execFile)

    try {
      await access(this.file)
    } catch {
      this.logger.error(`Fichier introuvable : ${this.file}`)
      this.exitCode = 1
      return
    }

    const conn = {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      database: this.database ?? env.get('DB_DATABASE'),
    }
    const password = env.get('DB_PASSWORD')
    const childEnv = password ? { ...process.env, PGPASSWORD: password } : process.env

    if (!this.force) {
      const confirmed = await this.prompt.confirm(
        `Restaurer « ${this.file} » dans la base « ${conn.database} » ? Les données actuelles seront écrasées.`
      )
      if (!confirmed) {
        this.logger.info('Restauration annulée.')
        return
      }
    }

    const isSql = this.file.endsWith('.sql')
    try {
      if (isSql) {
        // SQL simple rejoué tel quel (dump de pré-migration du déploiement, p. ex.).
        await run(
          'psql',
          [
            '-h',
            conn.host,
            '-p',
            String(conn.port),
            '-U',
            conn.user,
            '-d',
            conn.database,
            '-f',
            this.file,
          ],
          { env: childEnv }
        )
      } else {
        await run('pg_restore', pgRestoreArgs(conn, this.file), { env: childEnv })
      }
    } catch (error) {
      // pg_restore signale par un code de sortie non nul même sur des avertissements
      // bénins (--clean sur objets absents). On remonte le détail pour l'opérateur.
      this.logger.error(
        `Échec de la restauration : ${error instanceof Error ? error.message : error}`
      )
      this.exitCode = 1
      return
    }

    this.logger.success(`Restauration terminée dans « ${conn.database} » depuis ${this.file}.`)
  }
}
