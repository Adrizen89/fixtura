import db from '@adonisjs/lucid/services/db'
import Club from '#models/club'
import User from '#models/user'
import Tournament from '#models/tournament'
import Team from '#models/team'
import Match from '#models/match'

/**
 * Portabilité & effacement des données d'un club (RGPD — cf. CLAUDE.md §10, issue #36).
 *
 * Deux opérations, source unique de vérité pour l'export et la suppression des
 * données personnelles d'un club :
 *   - `exportClubData` — droit à la portabilité (RGPD art. 20) : reconstitue tout
 *     ce qui appartient à un club sous forme d'objet JSON sérialisable.
 *   - `deleteClubData` — droit à l'effacement (RGPD art. 17) : supprime le club et
 *     toutes ses données rattachées, de façon transactionnelle.
 *
 * Le cloisonnement suit l'architecture multi-tenant (cf. CLAUDE.md §5, §9) : seul
 * `Tournament` porte `club_id` ; `Team` et `Match` ne sont atteints qu'à travers un
 * tournoi déjà scopé au club. On ne touche donc jamais aux données d'un autre club.
 *
 * Aucune donnée sensible n'est exportée : le hash de mot de passe est exclu (le
 * modèle `User` le marque déjà `serializeAs: null`, on s'appuie sur `serialize()`).
 */

/** Version du format d'export (incrémentée en cas de changement de structure). */
export const CLUB_EXPORT_VERSION = 1

/** Identifiant du format, pour repérer un fichier d'export Fixtura. */
export const CLUB_EXPORT_FORMAT = 'fixtura-club-export'

export interface ClubDataExport {
  meta: {
    format: typeof CLUB_EXPORT_FORMAT
    version: number
    generatedAt: string
  }
  club: Record<string, unknown>
  /** Organisateurs du club — jamais le hash de mot de passe. */
  users: Record<string, unknown>[]
  /** Tournois du club, chacun avec ses équipes et ses matchs. */
  tournaments: Record<string, unknown>[]
}

/** Nombre d'enregistrements supprimés, par table (journalisation de l'effacement). */
export interface ClubDeletionReport {
  clubId: number
  matches: number
  teams: number
  tournaments: number
  users: number
  club: number
}

/**
 * Assemble l'intégralité des données d'un club sous forme d'objet exportable.
 * Lève une 404 (`firstOrFail`) si le club n'existe pas.
 */
export async function exportClubData(
  clubId: number,
  generatedAtISO: string
): Promise<ClubDataExport> {
  const club = await Club.query().where('id', clubId).firstOrFail()

  // Organisateurs listés à part (plutôt que via `preload`) pour éviter de les
  // dupliquer sous `club.users` en plus du tableau `users` de premier niveau.
  const users = await User.query().where('club_id', clubId).orderBy('id')

  const tournaments = await Tournament.query()
    .withScopes((scopes) => scopes.forClub(clubId))
    .preload('teams', (q) => q.orderBy('id'))
    .preload('matches', (q) => q.orderBy('scheduled_at').orderBy('terrain_number'))
    .orderBy('event_date')
    .orderBy('id')

  return {
    meta: {
      format: CLUB_EXPORT_FORMAT,
      version: CLUB_EXPORT_VERSION,
      generatedAt: generatedAtISO,
    },
    club: club.serialize(),
    // `serialize()` respecte `serializeAs: null` → le hash de mot de passe est exclu.
    users: users.map((u) => u.serialize()),
    // `serialize()` inclut les relations préchargées (`teams`, `matches`).
    tournaments: tournaments.map((t) => t.serialize()),
  }
}

/**
 * Supprime définitivement un club et toutes ses données rattachées (tournois,
 * équipes, matchs, organisateurs), dans une transaction unique — soit tout est
 * supprimé, soit rien. Retourne le décompte par table.
 *
 * Les contraintes FK `ON DELETE CASCADE` (cf. migrations) suffiraient à propager la
 * suppression depuis `clubs`, mais on supprime explicitement enfant → parent : le
 * comportement reste indépendant du moteur et le décompte est exact et vérifiable.
 */
export async function deleteClubData(clubId: number): Promise<ClubDeletionReport> {
  return db.transaction(async (trx) => {
    const club = await Club.query({ client: trx }).where('id', clubId).firstOrFail()

    const tournamentRows = await Tournament.query({ client: trx })
      .withScopes((scopes) => scopes.forClub(clubId))
      .select('id')
    const tournamentIds = tournamentRows.map((t) => t.id)

    // `.delete()` renvoie une valeur dépendante du driver : on dénombre d'abord
    // (via les identifiants) pour un décompte exact et typé, puis on supprime.
    const teamRows = tournamentIds.length
      ? await Team.query({ client: trx }).whereIn('tournament_id', tournamentIds).select('id')
      : []
    const matchRows = tournamentIds.length
      ? await Match.query({ client: trx }).whereIn('tournament_id', tournamentIds).select('id')
      : []
    const userRows = await User.query({ client: trx }).where('club_id', clubId).select('id')

    if (tournamentIds.length > 0) {
      await Match.query({ client: trx }).whereIn('tournament_id', tournamentIds).delete()
      await Team.query({ client: trx }).whereIn('tournament_id', tournamentIds).delete()
    }
    await Tournament.query({ client: trx })
      .withScopes((scopes) => scopes.forClub(clubId))
      .delete()
    await User.query({ client: trx }).where('club_id', clubId).delete()
    await club.useTransaction(trx).delete()

    return {
      clubId,
      matches: matchRows.length,
      teams: teamRows.length,
      tournaments: tournamentIds.length,
      users: userRows.length,
      club: 1,
    }
  })
}

/**
 * Nom de fichier suggéré pour un export (téléchargement web / CLI).
 * Ex. `fixtura-club-mon-club-2026-08-07.json`.
 */
export function exportFileName(clubSlug: string, dateISO: string): string {
  const date = dateISO.slice(0, 10)
  const slug = clubSlug || 'club'
  return `fixtura-club-${slug}-${date}.json`
}
