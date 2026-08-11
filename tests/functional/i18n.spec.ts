import { test } from '@japa/runner'
import { resetRateLimits } from '#services/rate_limit'

/**
 * Internationalisation (issue #123) — mécanisme testé de bout en bout via HTTP :
 * négociation de la langue (Accept-Language), sélecteur (cookie de préférence),
 * rendu SSR traduit du chrome commun, et messages de validation localisés.
 */
test.group('i18n · négociation & traduction (#123)', (group) => {
  group.each.setup(() => resetRateLimits())

  test('langue par défaut = français (chrome commun)', async ({ client, assert }) => {
    const res = await client.get('/login')
    res.assertStatus(200)
    assert.include(res.text(), 'Mentions légales')
  })

  test('Accept-Language: en → interface en anglais', async ({ client, assert }) => {
    const res = await client.get('/login').header('accept-language', 'en')
    res.assertStatus(200)
    assert.include(res.text(), 'Legal notice')
    assert.notInclude(res.text(), 'Mentions légales')
  })

  test('Accept-Language non pris en charge → repli français', async ({ client, assert }) => {
    const res = await client.get('/login').header('accept-language', 'de')
    res.assertStatus(200)
    assert.include(res.text(), 'Mentions légales')
  })

  test('le sélecteur de langue pose un cookie de préférence', async ({ client, assert }) => {
    const res = await client.get('/locale/en').redirects(0)
    res.assertStatus(302)
    // Un cookie « locale » est posé (préférence lue en priorité sur Accept-Language).
    assert.exists(res.headers()['set-cookie'])
    assert.include(String(res.headers()['set-cookie']), 'locale')
  })

  test('langue non prise en charge ignorée par le sélecteur (pas de cookie)', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/locale/de').redirects(0)
    res.assertStatus(302)
    const setCookie = String(res.headers()['set-cookie'] ?? '')
    assert.notInclude(setCookie, 'locale=')
  })

  test('messages de validation en français par défaut', async ({ client, assert }) => {
    const res = await client.post('/login').accept('json').json({})
    res.assertStatus(422)
    const messages = (res.body().errors ?? [])
      .map((e: { message: string }) => e.message)
      .join(' | ')
    assert.include(messages, 'obligatoire')
  })

  test('messages de validation en anglais quand la langue est EN', async ({ client, assert }) => {
    const res = await client.post('/login').accept('json').header('accept-language', 'en').json({})
    res.assertStatus(422)
    const messages = (res.body().errors ?? [])
      .map((e: { message: string }) => e.message)
      .join(' | ')
    assert.include(messages, 'required')
    assert.notInclude(messages, 'obligatoire')
  })

  test('page légale (CGU) traduite — FR par défaut', async ({ client, assert }) => {
    const res = await client.get('/cgu')
    res.assertStatus(200)
    // (Vue SSR échappe l'apostrophe en &#39; ; on cible la portion sans apostrophe.)
    assert.include(res.text(), 'Conditions générales')
    assert.include(res.text(), 'tournois de football')
  })

  test('page légale (CGU) traduite — EN via Accept-Language', async ({ client, assert }) => {
    const res = await client.get('/cgu').header('accept-language', 'en')
    res.assertStatus(200)
    // Contenu prose rendu via v-html + titre : la traduction anglaise s'affiche.
    assert.include(res.text(), 'Terms of use')
    assert.include(res.text(), 'football tournament management tool')
  })
})
