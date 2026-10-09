#!/bin/bash
set -e

REMOTE_HOST="mac-m1"
REMOTE_DIR="/Users/goldohrack/docker/engrais"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 [1/2] Synchronisation vers le Mac M1 ($REMOTE_DIR)..."
rsync -avz \
    --exclude '.git' \
    "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

echo "🐳 [2/2] Rechargement du conteneur VICON Engrais sur OrbStack..."
ssh "$REMOTE_HOST" "
    export PATH=\"\$HOME/.orbstack/bin:/usr/local/bin:\$PATH\"
    cd $REMOTE_DIR
    docker compose up -d --build
"

echo "✅ VICON Engrais déployé avec succès sur OrbStack !"
