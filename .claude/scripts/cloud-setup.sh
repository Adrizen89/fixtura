#!/usr/bin/env bash
#
# Prépare Fixtura dans une session CLOUD de Claude Code.
# S'exécute via le hook SessionStart (.claude/settings.json).
# NE FAIT RIEN en local : garde-fou sur CLAUDE_CODE_REMOTE.
#
# Pré-requis fournis par le « Setup Script » de l'environnement cloud
# (à coller dans claude.ai/code) : Node 24 installé via nvm + PostgreSQL démarré.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# --- Node 24 (le cloud fournit 20/21/22 ; on l'installe si absent) ---
# nvm est une FONCTION shell : il faut sourcer nvm.sh avant de l'utiliser.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || for d in "$HOME/.nvm" /usr/local/share/nvm /usr/local/nvm /opt/nvm /root/.nvm; do
  [ -s "$d/nvm.sh" ] && export NVM_DIR="$d" && break
done
# shellcheck disable=SC1090,SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
if command -v nvm >/dev/null 2>&1; then
  nvm use 24 >/dev/null 2>&1 || { nvm install 24 >/dev/null 2>&1 && nvm use 24 >/dev/null 2>&1; } || true
fi

# --- PostgreSQL (au cas où) + rôle/base de dev (idempotent) ---
sudo service postgresql start >/dev/null 2>&1 || service postgresql start >/dev/null 2>&1 || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='fixtura'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE fixtura LOGIN PASSWORD 'fixtura' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='fixtura'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres createdb -O fixtura fixtura 2>/dev/null || true

# --- Fichier .env de dev (gitignoré → absent du clone) ---
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^APP_KEY=.*|APP_KEY=$(openssl rand -hex 32)|" .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=fixtura|" .env
fi

# --- Dépendances + base ---
npm ci || npm install
node ace migration:run || true
node ace db:seed || true

echo "[cloud-setup] Fixtura prêt — Node $(node -v), dépendances installées, base migrée."
exit 0
