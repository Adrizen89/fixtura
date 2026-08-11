# Sauvegardes & restauration PostgreSQL (Fixtura)

> Sauvegardes régulières de la base et restauration **testée** (cf. CLAUDE.md §11,
> issue #119). Déploiement et planification opérés par Adrien : ce document se limite
> à l'outillage et à la procédure.

## 1. Ce qui est sauvegardé

L'intégralité de la base PostgreSQL de Fixtura (schéma + données) via `pg_dump` au
**format custom** (`-Fc`) : compressé et restaurable sélectivement par `pg_restore`.
Le classement n'est jamais stocké (recalculé à la volée, cf. §5) : la base contient
clubs, organisateurs, tournois/événements, équipes et matchs — tout ce qu'il faut
pour repartir à l'identique.

## 2. Outillage

Deux commandes Ace encapsulent `pg_dump` / `pg_restore` (logique pure testée dans
`app/services/backup.ts`) :

```bash
# Sauvegarde horodatée + rétention (ne conserve que les N plus récentes)
node ace db:backup --dir=/chemin/backups --keep=14

# Restauration d'un dump (opération destructrice → confirmation, sauf --force)
node ace db:restore /chemin/backups/fixtura-AAAAMMJJ-HHMMSS.dump
```

- **Dossier** : `--dir`, sinon `FIXTURA_BACKUP_DIR`, sinon `~/fixtura-backups`.
- **Rétention** : `--keep` (défaut **14**). Les fichiers `fixtura-*.dump` au-delà des
  N plus récents sont supprimés ; les autres fichiers ne sont jamais touchés.
- **Connexion** : lue depuis le `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_DATABASE`). Le mot de passe est passé par `PGPASSWORD`, jamais en
  argument.
- `db:restore` accepte aussi un `.sql` simple (rejoué par `psql`) — p. ex. le dump de
  pré-migration produit par le déploiement — et un `--database=autre_base` pour
  valider un dump sur une base de test sans toucher la production.

**Prérequis** : le paquet `postgresql-client` (fournit `pg_dump` / `pg_restore` /
`psql`) doit être installé sur la machine qui sauvegarde/restaure.

## 3. Planification (cron)

Sauvegarde quotidienne à 03:00 UTC, rétention 14 jours (~2 semaines glissantes) :

```cron
# /etc/cron.d/fixtura-backup  (ou `crontab -e` de l'utilisateur applicatif)
0 3 * * *  cd /var/www/fixtura && FIXTURA_BACKUP_DIR="$HOME/fixtura-backups" node ace db:backup --keep=14 >> "$HOME/fixtura-backups/backup.log" 2>&1
```

> Recommandation : recopier périodiquement le dossier de sauvegardes **hors du VPS**
> (stockage objet, autre hôte) pour survivre à la perte de la machine. Cette copie
> hors-site est laissée à l'appréciation d'Adrien.

## 4. Sauvegarde de pré-migration (déploiement)

Le workflow de déploiement (`.github/workflows/deploy.yml`) prend déjà un dump
**avant** chaque `migration:run` (rotation des 10 derniers), pour permettre un retour
arrière immédiat si une migration se passe mal. Les sauvegardes planifiées ci-dessus
sont **complémentaires** : elles couvrent la perte de données entre deux déploiements.

## 5. Procédure de restauration

1. **Choisir le dump** à restaurer dans le dossier de sauvegardes (le plus récent, ou
   celui précédant l'incident) : `ls -1t "$HOME/fixtura-backups"/fixtura-*.dump`.
2. **Arrêter l'application** pour éviter les écritures concurrentes :
   `pm2 stop ecosystem.config.cjs`.
3. **Restaurer** : `node ace db:restore "$HOME/fixtura-backups/fixtura-….dump"`
   (répondre « oui », ou `--force` en non-interactif). `pg_restore --clean` supprime
   puis recrée les objets à partir du dump.
4. **Relancer** : `pm2 start ecosystem.config.cjs` puis vérifier l'écran public d'un
   tournoi.

**Validation à blanc** (sans toucher la prod) : restaurer un dump dans une base
jetable pour vérifier son intégrité —
`createdb fixtura_check && node ace db:restore fichier.dump --database=fixtura_check --force && dropdb fixtura_check`.

## 6. Restauration testée (automatisée)

Le test `tests/functional/backup_restore.spec.ts` exécute un **aller-retour réel** à
chaque CI : il `pg_dump` la base, restaure le dump dans une base temporaire neuve avec
`pg_restore`, vérifie qu'une donnée distinctive s'y retrouve, puis supprime la base
temporaire. La procédure de restauration est donc vérifiée en continu, pas seulement
documentée.
