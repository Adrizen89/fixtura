import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import fr from '~/i18n/fr'
import en from '~/i18n/en'

/**
 * Internationalisation côté front (issue #123).
 *
 * Les dictionnaires sont **bundlés** (`~/i18n/{fr,en}`) et sélectionnés par la locale
 * partagée via Inertia (`page.props.locale`, posée par le serveur). Aucun rechargement
 * réseau, rendu SSR cohérent (serveur et client lisent la même locale).
 *
 * `t('clé.pointée', { param })` résout une clé imbriquée, interpole `{param}` et
 * **retombe sur le français** si la clé manque en anglais (puis sur la clé brute).
 */
type Catalog = Record<string, unknown>

const catalogs: Record<string, Catalog> = { fr, en }

function resolve(dict: Catalog, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    return acc && typeof acc === 'object' ? (acc as Catalog)[part] : undefined
  }, dict)
}

function interpolate(message: string, params?: Record<string, string | number>): string {
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`
  )
}

/** Étiquette BCP-47 pour `toLocaleDateString`/`toLocaleTimeString` selon la locale. */
const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' }

export function useI18n() {
  const page = usePage()
  const locale = computed(() => (page.props.locale as string | undefined) ?? 'fr')

  /**
   * Locale de formatage des dates/heures (Intl) dérivée de la langue active :
   * `fr` → `fr-FR`, `en` → `en-GB`. À passer à `toLocaleDateString(...)` en lieu et
   * place d'un code figé, pour que les dates s'affichent au format de la langue choisie.
   */
  const dateLocale = computed(() => DATE_LOCALES[locale.value] ?? 'fr-FR')

  function t(key: string, params?: Record<string, string | number>): string {
    const dict = catalogs[locale.value] ?? fr
    const value = resolve(dict, key)
    const resolved = value === undefined ? resolve(fr, key) : value
    return typeof resolved === 'string' ? interpolate(resolved, params) : key
  }

  return { t, locale, dateLocale }
}
