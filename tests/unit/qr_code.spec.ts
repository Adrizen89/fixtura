import { test } from '@japa/runner'
import { publicTournamentUrl, qrSvg } from '#services/qr_code'

/**
 * Génération de QR codes (issue #40) — logique pure (aucune dépendance HTTP/DB).
 */
test.group('qr_code', () => {
  test('construit l’URL publique absolue d’un tournoi', ({ assert }) => {
    assert.equal(
      publicTournamentUrl('https://fixtura.fr', 'abc-123'),
      'https://fixtura.fr/t/abc-123'
    )
    // Tolère un slash final sur l'origine.
    assert.equal(
      publicTournamentUrl('https://fixtura.fr/', 'abc-123'),
      'https://fixtura.fr/t/abc-123'
    )
  })

  test('produit un SVG valide encodant le contenu', ({ assert }) => {
    const svg = qrSvg('https://fixtura.fr/t/abc-123')
    assert.match(svg, /^<\?xml|^<svg|<svg/)
    assert.include(svg, '<svg')
    assert.include(svg, '</svg>')
  })
})
