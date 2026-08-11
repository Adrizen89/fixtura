/**
 * Messages de validation VineJS — **désormais internationalisés** (issue #123).
 *
 * Avant #123, un `SimpleMessagesProvider` global fournissait les messages en français.
 * Ils vivent maintenant dans les catalogues i18n `resources/lang/{locale}/validator.json`
 * (règles `validator.shared.messages.*` + noms de champs `validator.shared.fields.*`),
 * câblés par le middleware `detect_user_locale` via `RequestValidator.messagesProvider`.
 *
 * Toutes les validations passent par `request.validateUsing` (contrôleurs HTTP), qui
 * applique le provider i18n de la locale courante — FR par défaut, EN si demandé, avec
 * repli FR pour toute clé manquante. Ce fichier n'a donc plus de provider à déclarer ;
 * il reste dans les `preloads` comme point d'ancrage documentaire. Toute nouvelle règle
 * ou tout nouveau champ se traduit en ajoutant sa clé dans les deux catalogues.
 */
