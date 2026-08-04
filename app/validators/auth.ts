import vine from '@vinejs/vine'

/**
 * Validation du formulaire de connexion.
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string(),
  })
)
