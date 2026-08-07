import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * `node ace club:export <clubId> [--output=chemin.json]`
 *
 * Exporte toutes les données d'un club (RGPD art. 20 — portabilité) au format JSON.
 * Sans `--output`, le JSON est écrit sur la sortie standard (redirigeable vers un
 * fichier). Procédure opérée par ADBDigital (cf. docs/rgpd.md, issue #36).
 */
export default class ClubExport extends BaseCommand {
  static commandName = 'club:export'
  static description = "Exporter les données d'un club au format JSON (RGPD — portabilité)"
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Identifiant du club à exporter' })
  declare clubId: string

  @flags.string({
    description: 'Chemin du fichier de sortie (sinon : sortie standard)',
    alias: 'o',
  })
  declare output?: string

  async run() {
    const { DateTime } = await import('luxon')
    const { exportClubData, exportFileName } = await import('#services/club_data')

    const clubId = Number(this.clubId)
    if (!Number.isInteger(clubId) || clubId <= 0) {
      this.logger.error(`Identifiant de club invalide : « ${this.clubId} »`)
      this.exitCode = 1
      return
    }

    try {
      const generatedAt = DateTime.now().toISO()!
      const data = await exportClubData(clubId, generatedAt)
      const json = JSON.stringify(data, null, 2)

      if (this.output) {
        const { writeFile } = await import('node:fs/promises')
        await writeFile(this.output, json, 'utf-8')
        this.logger.success(`Export écrit dans ${this.output}`)
        this.logger.info(
          `Club « ${data.club.name} » — ${data.users.length} organisateur(s), ${data.tournaments.length} tournoi(s).`
        )
        this.logger.info(
          `Nom suggéré : ${exportFileName(String(data.club.slug ?? 'club'), generatedAt)}`
        )
      } else {
        this.logger.log(json)
      }
    } catch (error) {
      this.logger.error(`Export impossible : club #${clubId} introuvable.`)
      this.exitCode = 1
    }
  }
}
