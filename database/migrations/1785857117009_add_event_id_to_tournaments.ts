import { BaseSchema } from '@adonisjs/lucid/schema'
import { randomBytes } from 'node:crypto'

/**
 * Rattache chaque tournoi (= catégorie) à un `event` (v2 — issue #32).
 *
 * Rétro-compatible avec les données v1 : la colonne `event_id` est d'abord ajoutée
 * **nullable**, puis un backfill crée **un événement par tournoi existant** (en
 * copiant ses paramètres horaires + son pool de terrains) et relie les deux — si
 * bien qu'« un tournoi seul = un événement à une catégorie » (cf. critère d'accept.
 * de #32). `event_id` reste nullable pour ne pas casser le flux « tournoi
 * autonome » du MVP, mais après cette migration aucun tournoi n'est orphelin.
 *
 * `onDelete('SET NULL')` : supprimer un événement ne supprime pas ses catégories
 * (on ne veut jamais perdre un tournoi et ses résultats par ricochet).
 */

/** Slugify local (autonome — la migration ne dépend d'aucun service applicatif). */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Slug public non devinable : base lisible + suffixe aléatoire. */
function publicSlug(name: string): string {
  const base = slugify(name) || 'evenement'
  const suffix = randomBytes(9)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 10)
  return `${base}-${suffix}`
}

export default class extends BaseSchema {
  protected tableName = 'tournaments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('event_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('events')
        .onDelete('SET NULL')
      table.index(['event_id'])
    })

    // Backfill : un événement par tournoi existant, puis liaison.
    this.defer(async (db) => {
      const tournaments = await db
        .from('tournaments')
        .select(
          'id',
          'club_id',
          'name',
          'event_date',
          'start_time',
          'match_duration_min',
          'break_duration_min',
          'lunch_start',
          'lunch_duration_min',
          'num_terrains'
        )

      for (const t of tournaments) {
        const now = new Date()
        const [event] = await db
          .table('events')
          .insert({
            club_id: t.club_id,
            name: t.name,
            event_date: t.event_date,
            start_time: t.start_time,
            match_duration_min: t.match_duration_min,
            break_duration_min: t.break_duration_min,
            lunch_start: t.lunch_start,
            lunch_duration_min: t.lunch_duration_min,
            num_terrains: t.num_terrains,
            status: 'draft',
            public_slug: publicSlug(t.name),
            created_at: now,
            updated_at: now,
          })
          .returning('id')

        const eventId = typeof event === 'object' ? event.id : event
        await db.from('tournaments').where('id', t.id).update({ event_id: eventId })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('event_id')
    })
  }
}
