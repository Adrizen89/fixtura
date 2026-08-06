import vine, { SimpleMessagesProvider } from '@vinejs/vine'

/**
 * Messages de validation en français, appliqués à **tous** les validators VineJS
 * (cf. CLAUDE.md §8 · issue #8). Par défaut VineJS produit des messages en anglais ;
 * on fournit ici une traduction claire + des noms de champs lisibles, pour que
 * chaque erreur affichée à l'organisateur soit compréhensible.
 *
 * - Clés génériques (`required`, `minLength`, …) : message par règle, avec le nom
 *   du champ interpolé via `{{ field }}` (traduit par la table `fields` ci-dessous).
 * - Clés spécifiques `champ.règle` (ex. `eventDate.regex`) : message ciblé, utile
 *   là où un format précis est attendu (date, heure).
 *
 * Les règles personnalisées qui rapportent déjà leur propre message (ex. l'unicité
 * du nom d'équipe) ne sont pas affectées.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    // Règles génériques
    'required': 'Le champ {{ field }} est obligatoire.',
    'string': 'Le champ {{ field }} doit être une chaîne de caractères.',
    'email': 'Le champ {{ field }} doit être une adresse e-mail valide.',
    'number': 'Le champ {{ field }} doit être un nombre.',
    'withoutDecimals': 'Le champ {{ field }} doit être un entier.',
    'enum': 'La valeur du champ {{ field }} est invalide.',
    'minLength': 'Le champ {{ field }} doit contenir au moins {{ min }} caractère(s).',
    'maxLength': 'Le champ {{ field }} ne doit pas dépasser {{ max }} caractère(s).',
    'min': 'Le champ {{ field }} doit être au moins {{ min }}.',
    'max': 'Le champ {{ field }} ne doit pas dépasser {{ max }}.',
    'regex': 'Le champ {{ field }} n’est pas au bon format.',

    // Messages ciblés (formats précis)
    'eventDate.regex': 'La date doit être au format AAAA-MM-JJ.',
    'startTime.regex': 'L’heure de début doit être au format HH:MM.',
    'lunchStart.regex': 'L’heure de la pause déjeuner doit être au format HH:MM.',
    'time.regex': 'L’heure doit être au format HH:MM.',
  },
  {
    // Noms de champs lisibles (interpolés dans `{{ field }}`)
    name: 'nom',
    category: 'catégorie',
    eventDate: 'date',
    startTime: 'heure de début',
    matchDurationMin: 'durée d’un match',
    breakDurationMin: 'pause entre matchs',
    lunchStart: 'début de pause déjeuner',
    lunchDurationMin: 'durée de pause déjeuner',
    numTerrains: 'nombre de terrains',
    email: 'adresse e-mail',
    password: 'mot de passe',
    homeScore: 'score domicile',
    awayScore: 'score extérieur',
    time: 'heure',
    terrainNumber: 'terrain',
    side: 'côté',
  }
)
