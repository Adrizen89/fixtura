# RGPD — registre & procédures (Fixtura)

> Mise en conformité avant l'ouverture à des clubs tiers (cf. CLAUDE.md §10, issue #36).
> Pages publiques associées : `/mentions-legales`, `/cgu`, `/confidentialite`.

## 1. Données traitées (registre)

| Donnée | Table | Caractère personnel | Finalité |
|---|---|---|---|
| Nom (facultatif), e-mail, rôle | `users` | Oui | Authentifier les organisateurs |
| Mot de passe **haché** (scrypt) | `users` | Oui (secret) | Sécuriser l'accès |
| Nom d'équipe | `teams` | Non (dénomination) | Planning, résultats, classement |
| E-mail de contact d'équipe (facultatif) | `teams` | Oui | Contacter l'équipe inscrite en ligne (#112) |
| Paramètres, scores, horodatage, auteur de saisie | `tournaments`, `matches` | Indirect | Générer le planning et le classement |
| Nom / slug du club | `clubs` | Non | Racine multi-tenant |

**Minimisation** : aucune donnée de joueur (nom, âge, licence). Les équipes ne sont
qu'un **nom** (+ un e-mail de contact **uniquement** en cas d'inscription en ligne,
cf. ci-dessous). L'écran public (lecture seule, lien non devinable) n'expose que le
nom du tournoi, les équipes, les scores et le classement — **jamais** un e-mail ou un
compte.

**Inscription publique d'une équipe (#112)** : un formulaire public
(`/inscription/:token`, sans compte, **sans paiement**) collecte le **nom d'équipe**
et un **e-mail de contact** — données minimales, finalité affichée (organiser le
tournoi), lien vers la politique de confidentialité sur le formulaire. L'e-mail est
visible de l'organisateur (gestion des équipes) et **jamais** diffusé sur l'écran
public. Il est inclus dans l'export (§3) et l'effacement (§4) du club, avec le reste
des équipes. Anti-abus : honeypot + limitation de débit (aucune donnée de traçage).

## 2. Aucune ressource tierce traçante

Vérifié à la date de l'issue #36 :

- **Polices self-hostées** (Inter, woff2 servi depuis `public/fonts/`) — aucun Google
  Fonts, aucun CDN externe (cf. `inertia/css/app.css`).
- **Aucun outil de mesure d'audience ni pixel** (pas de Google Analytics, etc.).
- Cookies **strictement nécessaires** uniquement : session (auth) + anti-CSRF.
- Contrôle rapide (doit ne rien renvoyer) :

  ```bash
  grep -rniE "googleapis|gstatic|fonts.google|google-analytics|googletagmanager|cdn\.|unpkg|jsdelivr" inertia/ resources/ public/
  ```

## 3. Portabilité — export des données d'un club (art. 20)

- **Libre-service (web)** : le responsable du club (`owner`) clique sur
  « Exporter mes données » (pied de page) → téléchargement d'un JSON complet
  (`GET /compte/export`). Toujours scopé au club du compte.
- **Opéré par ADBDigital (CLI)** :

  ```bash
  node ace club:export <clubId> --output=export-club.json
  # sans --output : le JSON est écrit sur la sortie standard
  ```

L'export contient le club, les organisateurs (**sans** hash de mot de passe), et les
tournois avec leurs équipes et matchs. Format : `fixtura-club-export` v1.

## 4. Effacement des données d'un club (art. 17)

Sur demande écrite (`adri.veille.tech@gmail.com`), ADBDigital exécute :

```bash
node ace club:delete <clubId>          # demande une confirmation
node ace club:delete <clubId> --force  # sans confirmation (scripts)
```

La suppression est **transactionnelle et irréversible** : club, organisateurs,
tournois, équipes et matchs. Exporter d'abord (§3) si une copie doit être remise à la
personne concernée.

## 5. Où c'est implémenté

- Logique : `app/services/club_data.ts` (`exportClubData`, `deleteClubData`).
- Web : `app/controllers/account_controller.ts` (owner) · `app/controllers/legal_controller.ts`.
- CLI : `commands/club_export.ts`, `commands/club_delete.ts`.
- Pages : `inertia/pages/legal/*`, pied de page `inertia/components/SiteFooter.vue`.
- Tests : `tests/functional/legal.spec.ts`, `tests/functional/rgpd.spec.ts`.
