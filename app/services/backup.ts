import type { DateTime } from 'luxon'

/**
 * Sauvegardes PostgreSQL — cœur **pur** (issue #119).
 *
 * Aucune I/O ni dépendance DB : cette couche construit les **noms de fichiers**, la
 * **politique de rétention** et les **arguments** de `pg_dump` / `pg_restore`. Les
 * commandes `db:backup` / `db:restore` (et le test d'aller-retour réel) s'appuient
 * dessus, ce qui rend la logique testable sans exécuter Postgres.
 *
 * Déploiement géré par Adrien (cf. CLAUDE.md §11) : on se limite à l'outillage et à
 * la procédure. Le format retenu est le **format custom** de PostgreSQL (`-Fc`,
 * compressé, restaurable par `pg_restore` avec `--clean`), et la planification se
 * fait par cron (cf. `docs/backups.md`).
 */

/** Paramètres de connexion PostgreSQL (le mot de passe passe par `PGPASSWORD`). */
export interface PgConnection {
  host: string
  port: number
  user: string
  database: string
}

const FILE_PREFIX = 'fixtura-'
const FILE_EXT = '.dump'
/** Nom d'une sauvegarde Fixtura : `fixtura-AAAAMMJJ-HHMMSS.dump` (horodatage UTC). */
const FILE_REGEX = /^fixtura-\d{8}-\d{6}\.dump$/

/** Nom de fichier horodaté (UTC) d'une sauvegarde. */
export function backupFileName(now: DateTime): string {
  return `${FILE_PREFIX}${now.toUTC().toFormat('yyyyLLdd-HHmmss')}${FILE_EXT}`
}

/** true si `name` est une sauvegarde Fixtura (format custom). */
export function isBackupFile(name: string): boolean {
  return FILE_REGEX.test(name)
}

/**
 * Parmi une liste de fichiers, ceux à **supprimer** pour ne conserver que les `keep`
 * sauvegardes les plus récentes. Le tri est lexicographique décroissant : l'horodatage
 * UTC contenu dans le nom est déjà chronologique. Les fichiers non reconnus comme des
 * sauvegardes Fixtura sont ignorés (jamais supprimés). `keep <= 0` ⇒ ne rien conserver.
 */
export function backupsToPrune(files: string[], keep: number): string[] {
  const backups = files.filter(isBackupFile).sort().reverse() // plus récent d'abord
  return keep <= 0 ? backups : backups.slice(keep)
}

/** Arguments `pg_dump` : format custom compressé (`-Fc`) vers `outPath`. */
export function pgDumpArgs(conn: PgConnection, outPath: string): string[] {
  return [
    '-h',
    conn.host,
    '-p',
    String(conn.port),
    '-U',
    conn.user,
    '-d',
    conn.database,
    '-Fc', // format custom : compressé, restauration sélective possible
    '--no-owner',
    '--no-privileges',
    '-f',
    outPath,
  ]
}

/**
 * Arguments `pg_restore` : restauration **propre** (`--clean --if-exists`) du dump
 * `inPath` dans la base `conn.database`. `--no-owner`/`--no-privileges` évitent les
 * erreurs de rôles absents lors d'une restauration sur une autre machine.
 */
export function pgRestoreArgs(conn: PgConnection, inPath: string): string[] {
  return [
    '-h',
    conn.host,
    '-p',
    String(conn.port),
    '-U',
    conn.user,
    '-d',
    conn.database,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    inPath,
  ]
}
