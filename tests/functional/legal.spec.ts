import { test } from '@japa/runner'

/**
 * Pages légales publiques (cf. CLAUDE.md §10 · issue #36).
 *
 * Elles doivent répondre **sans authentification** (information des personnes exigée
 * par le RGPD) et être rendues par Inertia (SSR). On vérifie le statut 200 et la
 * présence du titre attendu dans le HTML rendu côté serveur.
 */
test.group('Pages légales (fonctionnel)', () => {
  // Needles sans apostrophe : Vue SSR échappe « ' » en « &#39; » dans le texte rendu.
  const pages: Array<{ url: string; needle: string }> = [
    { url: '/mentions-legales', needle: 'Mentions légales' },
    { url: '/cgu', needle: 'Conditions générales' },
    { url: '/confidentialite', needle: 'Politique de confidentialité' },
  ]

  for (const { url, needle } of pages) {
    test(`${url} répond 200 sans authentification`, async ({ client }) => {
      const res = await client.get(url)
      res.assertStatus(200)
      res.assertTextIncludes(needle)
    })
  }
})
