import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import db from '@adonisjs/lucid/services/db'
import Tournament from '#models/tournament'
import Team from '#models/team'
import { teamImportValidator } from '#validators/team'
import { parseCsv, extractXlsxRows, buildImportPreview } from '#services/team_import'

/**
 * Import d'équipes depuis un fichier CSV / Excel (issue #120).
 *
 * Flux en deux temps, sans état serveur entre les deux :
 *  1. `preview` — l'organisateur téléverse un fichier ; on renvoie un **aperçu JSON**
 *     (noms détectés + verdict ligne par ligne). Réponse JSON volontaire (et non un
 *     rendu Inertia) : pas de round-trip de page, et on évite de stocker un aperçu
 *     volumineux dans la session cookie.
 *  2. `store` — l'organisateur confirme ; on insère les noms retenus après avoir
 *     **réappliqué** la validation et la déduplication (l'aperçu peut être périmé).
 *
 * Cloisonnement par club **automatique** (scope global `TenantContext`, cf. #34) :
 * un tournoi hors club → 404.
 */
export default class TeamsImportController {
  private findTournament(id: number | string) {
    return Tournament.query().where('id', id).firstOrFail()
  }

  /** Téléversement → aperçu JSON (aucune écriture). */
  async preview({ request, params, response }: HttpContext) {
    const tournament = await this.findTournament(params.id)

    const file = request.file('file', { size: '5mb', extnames: ['csv', 'xlsx'] })
    if (!file) {
      return response.unprocessableEntity({ error: 'Aucun fichier reçu.' })
    }
    if (!file.isValid) {
      const message = file.errors[0]?.message ?? 'Fichier invalide (CSV ou XLSX attendu, ≤ 5 Mo).'
      return response.unprocessableEntity({ error: message })
    }

    let rows: string[][]
    try {
      const buffer = await readFile(file.tmpPath!)
      rows =
        file.extname === 'xlsx' ? await extractXlsxRows(buffer) : parseCsv(buffer.toString('utf-8'))
    } catch {
      return response.unprocessableEntity({
        error: 'Impossible de lire le fichier. Vérifiez qu’il n’est pas corrompu.',
      })
    }

    const existing = await Team.query().where('tournament_id', tournament.id).select('name')
    const preview = buildImportPreview(
      rows,
      existing.map((t) => t.name)
    )
    return response.ok(preview)
  }

  /** Confirmation : insère les noms retenus (validation + dédup réappliquées). */
  async store({ request, params, response, session }: HttpContext) {
    const tournament = await this.findTournament(params.id)
    const { names } = await request.validateUsing(teamImportValidator)

    const existingRows = await Team.query().where('tournament_id', tournament.id).select('name')
    const existing = new Set(existingRows.map((t) => t.name.trim().toLowerCase()))

    // Dédup insensible à la casse : au sein de la charge utile ET vis-à-vis de l'existant.
    const seen = new Set<string>()
    const toInsert: string[] = []
    for (const raw of names) {
      const name = raw.trim()
      if (name.length < 1 || name.length > 60) continue
      const key = name.toLowerCase()
      if (existing.has(key) || seen.has(key)) continue
      seen.add(key)
      toInsert.push(name)
    }

    if (toInsert.length > 0) {
      await db.transaction(async (trx) => {
        await Team.createMany(
          toInsert.map((name) => ({ tournamentId: tournament.id, name })),
          { client: trx }
        )
      })
    }

    const skipped = names.length - toInsert.length
    const parts = [
      `${toInsert.length} équipe${toInsert.length > 1 ? 's' : ''} importée${toInsert.length > 1 ? 's' : ''}`,
    ]
    if (skipped > 0) parts.push(`${skipped} ignorée${skipped > 1 ? 's' : ''} (doublons)`)
    session.flash(toInsert.length > 0 ? 'success' : 'error', `${parts.join(', ')}.`)

    return response.redirect().toRoute('tournaments.show', { id: tournament.id })
  }
}
