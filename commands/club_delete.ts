import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * `node ace club:delete <clubId> [--force]`
 *
 * Supprime définitivement un club et toutes ses données (tournois, équipes, matchs,
 * organisateurs) — RGPD art. 17 (droit à l'effacement). Opération **irréversible** :
 * une confirmation est demandée sauf si `--force`. Procédure opérée par ADBDigital
 * sur demande d'effacement (cf. docs/rgpd.md, issue #36).
 */
export default class ClubDelete extends BaseCommand {
  static commandName = 'club:delete'
  static description = 'Supprimer définitivement un club et toutes ses données (RGPD — effacement)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Identifiant du club à supprimer' })
  declare clubId: string

  @flags.boolean({
    description: 'Supprimer sans demander de confirmation',
    alias: 'f',
  })
  declare force: boolean

  async run() {
    const { default: Club } = await import('#models/club')
    const { deleteClubData } = await import('#services/club_data')

    const clubId = Number(this.clubId)
    if (!Number.isInteger(clubId) || clubId <= 0) {
      this.logger.error(`Identifiant de club invalide : « ${this.clubId} »`)
      this.exitCode = 1
      return
    }

    const club = await Club.find(clubId)
    if (!club) {
      this.logger.error(`Club #${clubId} introuvable.`)
      this.exitCode = 1
      return
    }

    if (!this.force) {
      const confirmed = await this.prompt.confirm(
        `Supprimer DÉFINITIVEMENT le club « ${club.name} » (#${clubId}) et TOUTES ses données ?`
      )
      if (!confirmed) {
        this.logger.info('Suppression annulée.')
        return
      }
    }

    const report = await deleteClubData(clubId)
    this.logger.success(`Club « ${club.name} » (#${clubId}) supprimé.`)
    this.logger.info(
      `Supprimés : ${report.tournaments} tournoi(s), ${report.teams} équipe(s), ` +
        `${report.matches} match(s), ${report.users} organisateur(s).`
    )
  }
}
