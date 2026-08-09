import ExcelJS from 'exceljs'

/**
 * Import d'équipes depuis un fichier CSV / Excel (issue #120).
 *
 * Le cœur (parsing CSV + construction de l'aperçu) est **pur** : aucune I/O, aucune
 * dépendance DB → entièrement testable. L'extraction XLSX (`extractXlsxRows`) est la
 * seule partie « impure » (lecture d'un classeur via ExcelJS), volontairement mince
 * pour ramener le binaire à la même matrice de cellules que le CSV.
 *
 * Les équipes n'ont qu'un **nom** (cf. CLAUDE.md §3) : on n'importe donc qu'une
 * colonne. La validation reprend les règles du `teamValidator` (nom 1–60 caractères,
 * unicité insensible à la casse dans le tournoi) et déduplique aussi **au sein du
 * fichier**. Chaque ligne reçoit un verdict → l'aperçu montre les erreurs ligne par ligne.
 */

/** Longueur maximale d'un nom d'équipe (aligné sur `teamValidator`). */
export const MAX_TEAM_NAME = 60

/** Nombre maximal de lignes de données traitées (garde-fou anti-abus). */
export const MAX_IMPORT_ROWS = 500

/** Verdict d'une ligne de l'aperçu. */
export type ImportRowStatus = 'ok' | 'empty' | 'too_long' | 'duplicate_file' | 'duplicate_existing'

/** Une ligne analysée du fichier (dans l'ordre du fichier). */
export interface ImportRow {
  /** Numéro de ligne dans le fichier (1-based, en-tête comprise). */
  line: number
  /** Valeur brute de la cellule « nom ». */
  raw: string
  /** Nom nettoyé (trim). */
  name: string
  status: ImportRowStatus
}

/** Aperçu complet d'un import, prêt à afficher puis à confirmer. */
export interface ImportPreview {
  rows: ImportRow[]
  /** Noms valides et dédupliqués, dans l'ordre, prêts à insérer. */
  importable: string[]
  counts: { total: number; ok: number; skipped: number }
  /** true si le fichier dépassait `MAX_IMPORT_ROWS` (lignes au-delà ignorées). */
  truncated: boolean
}

/** En-têtes reconnus pour repérer la colonne « nom » (comparaison lower/trim). */
const HEADER_KEYS = new Set([
  'nom',
  'noms',
  'équipe',
  'equipe',
  'équipes',
  'equipes',
  "nom d'équipe",
  "nom de l'équipe",
  'nom equipe',
  'team',
  'teams',
  'team name',
  'name',
])

/** Détecte le séparateur CSV le plus probable depuis la 1re ligne (`,` par défaut). */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? ''
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && (ch === ',' || ch === ';' || ch === '\t')) counts[ch]++
  }
  const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
  return counts[best] > 0 ? best : ','
}

/**
 * Analyse un CSV en matrice de cellules (RFC 4180 : guillemets, `""` échappé,
 * champs multi-lignes). Gère le BOM, les fins de ligne LF/CRLF/CR, et le séparateur
 * `,` ou `;` (export Excel FR) détecté automatiquement. Fonction **pure**.
 */
export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '') // retire le BOM éventuel
  const delimiter = detectDelimiter(text)

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++ // guillemet échappé
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch === '\r') {
      // CRLF : on laisse le `\n` clore la ligne ; CR isolé (ancien Mac) : on clôt ici.
      if (text[i + 1] !== '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
    } else {
      field += ch
    }
  }

  // Dernier champ / dernière ligne (fichier sans saut de ligne final).
  row.push(field)
  rows.push(row)
  return rows
}

/** Repère la colonne « nom » : par en-tête reconnu, sinon la 1re colonne. */
function detectNameColumn(rows: string[][]): { col: number; headerRow: boolean } {
  const first = rows[0]
  if (first) {
    const idx = first.findIndex((c) => HEADER_KEYS.has(c.trim().toLowerCase()))
    if (idx !== -1) return { col: idx, headerRow: true }
  }
  return { col: 0, headerRow: false }
}

/** true si toutes les cellules de la ligne sont vides (ligne de bruit à ignorer). */
function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === '')
}

/**
 * Construit l'aperçu d'import à partir d'une matrice de cellules et des noms
 * d'équipes **déjà présents** dans le tournoi. Validation ligne par ligne :
 * vide / trop long / doublon (dans le fichier ou déjà présent) / OK. Déduplication
 * insensible à la casse. Fonction **pure**.
 */
export function buildImportPreview(rows: string[][], existingNames: string[]): ImportPreview {
  const { col, headerRow } = detectNameColumn(rows)
  const dataStart = headerRow ? 1 : 0

  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  const seen = new Set<string>()
  const outRows: ImportRow[] = []
  const importable: string[] = []
  let truncated = false

  for (let i = dataStart; i < rows.length; i++) {
    if (outRows.length >= MAX_IMPORT_ROWS) {
      truncated = true
      break
    }
    const cells = rows[i]
    if (isBlankRow(cells)) continue // ligne entièrement vide (bruit / saut final)

    const raw = cells[col] ?? ''
    const name = raw.trim()
    let status: ImportRowStatus

    if (name.length === 0) {
      status = 'empty'
    } else if (name.length > MAX_TEAM_NAME) {
      status = 'too_long'
    } else {
      const key = name.toLowerCase()
      if (existing.has(key)) {
        status = 'duplicate_existing'
      } else if (seen.has(key)) {
        status = 'duplicate_file'
      } else {
        status = 'ok'
        seen.add(key)
        importable.push(name)
      }
    }

    outRows.push({ line: i + 1, raw, name, status })
  }

  const ok = importable.length
  return {
    rows: outRows,
    importable,
    counts: { total: outRows.length, ok, skipped: outRows.length - ok },
    truncated,
  }
}

/** Texte d'une cellule ExcelJS (string, nombre, formule, texte riche, lien…). */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    // Texte riche : { richText: [{ text }] }.
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
    // Formule : { result }. Hyperlien : { text }. Erreur : { error }.
    if ('result' in value && value.result !== undefined)
      return cellText(value.result as ExcelJS.CellValue)
    if ('text' in value && value.text !== undefined) return String(value.text)
  }
  return ''
}

/**
 * Extrait les lignes de la 1re feuille d'un classeur XLSX en matrice de cellules,
 * pour la ramener au même format que le CSV. Seule partie non pure (lecture ExcelJS).
 */
export async function extractXlsxRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  // ExcelJS augmente le type global `Buffer` (extends ArrayBuffer) : on caste pour
  // réconcilier avec le `Buffer` de Node retourné par `readFile` (compatible au runtime).
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = []
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(cellText(cell.value)))
    rows.push(cells)
  })
  return rows
}
