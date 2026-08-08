import type { HttpContext } from '@adonisjs/core/http'
import Tournament from '#models/tournament'
import { computePalmares } from '#services/palmares'
import type { PalmaresTournamentInput } from '#services/palmares'

/**
 * Palmarès du club (issue #109, sous-issue de #98).
 *
 * Vue **admin** agrégée : vainqueur / finaliste de chaque édition **terminée** et
 * bilan cumulé par équipe (participations, victoires, ratio). Le calcul est délégué
 * au service **pur** `computePalmares` (jamais stocké — cf. CLAUDE.md §5, §13).
 *
 * On agrège **toutes** les éditions terminées du club, y compris les catégories d'un
 * événement (chaque catégorie est un tournoi avec son propre vainqueur) : le bilan
 * d'une équipe doit compter chacune de ses participations. Cloisonnement par club
 * **automatique** (scope global `TenantContext` — issue #34).
 */
export default class PalmaresController {
  async index({ inertia }: HttpContext) {
    const tournaments = await Tournament.query()
      .where('status', 'finished')
      .preload('teams')
      .preload('matches')
      .orderBy('event_date', 'desc')

    const inputs: PalmaresTournamentInput[] = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      eventDate: t.eventDate?.toISODate() ?? null,
      format: t.format,
      teams: t.teams.map((team) => ({ id: team.id, name: team.name })),
      matches: t.matches.map((m) => ({
        stage: m.stage,
        bracketRound: m.bracketRound,
        status: m.status,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
      scoring: t.scoring,
    }))

    const { editions, teamRecords } = computePalmares(inputs)

    return inertia.render('palmares/index', { editions, teamRecords })
  }
}
