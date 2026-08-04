/**
 * Erreurs du module de génération de planning.
 * Le scheduler ne produit JAMAIS un planning silencieusement invalide :
 * il réussit, ou lève une de ces erreurs avec un message explicite.
 */
export class SchedulerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchedulerError'
  }
}

/**
 * Levée quand aucun planning valide ne peut être construit avec les paramètres
 * fournis (garde-fou ; ne devrait pas survenir pour des entrées valides).
 */
export class InfeasibleScheduleError extends SchedulerError {
  constructor(message: string) {
    super(message)
    this.name = 'InfeasibleScheduleError'
  }
}
