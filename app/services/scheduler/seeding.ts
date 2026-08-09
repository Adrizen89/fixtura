/**
 * Placement des têtes de série d'un arbre — TypeScript pur, aucune dépendance DB.
 *
 * Partagé par les moteurs à brackets (élimination directe `knockout`, double
 * élimination `double_elimination`) : une seule source de vérité pour la taille de
 * bracket et le croisement standard des têtes de série.
 */

/** Prochaine puissance de 2 ≥ n (n ≥ 1). */
export function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/**
 * Ordre de tête de série standard des positions d'un bracket de taille `size`
 * (puissance de 2). Renvoie, pour chaque position (de haut en bas), le numéro de
 * tête de série qui l'occupe. Construit récursivement de sorte que la meilleure
 * tête affronte la moins bien classée, et que les têtes 1 et 2 se trouvent dans
 * des moitiés opposées (elles ne peuvent se croiser qu'en finale).
 *
 * size=4 → [1, 4, 2, 3] ; size=8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function seedPositions(size: number): number[] {
  let seeds = [1]
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1
    const next: number[] = []
    for (const s of seeds) {
      next.push(s)
      next.push(sum - s)
    }
    seeds = next
  }
  return seeds
}
