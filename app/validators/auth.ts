import vine from '@vinejs/vine'

/**
 * Validation du formulaire de connexion.
 *
 * L'email est simplement `trim` + mis en minuscules — on NE retire PAS les points.
 * `normalizeEmail()` (validator.js) supprimait les points des adresses Gmail
 * (`a.b@gmail.com` → `ab@gmail.com`), ce qui cassait la connexion quand l'email
 * était stocké avec ses points. La même règle est appliquée au stockage
 * (`normalizeEmail` du modèle User), pour une comparaison cohérente et une
 * connexion insensible à la casse.
 */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().toLowerCase(),
    password: vine.string(),
  })
)
