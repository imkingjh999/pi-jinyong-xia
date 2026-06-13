#!/usr/bin/env bash
# Upload achievement badge PNGs to Cloudflare R2 bucket
# Requires: wrangler CLI installed and logged in
#
# Usage: ./scripts/upload-badges.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BADGES_DIR="$SCRIPT_DIR/../assets/achievements"
BUCKET="xia-achievement-badges"

if [ ! -d "$BADGES_DIR" ]; then
    echo "ERROR: $BADGES_DIR not found. Run gen-achievements.py first."
    exit 1
fi

count=$(ls "$BADGES_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$count" -eq 0 ]; then
    echo "ERROR: No PNG files in $BADGES_DIR. Run gen-achievements.py first."
    exit 1
fi

echo "Uploading $count achievement badges to R2 bucket '$BUCKET'..."

for f in "$BADGES_DIR"/*.png; do
    filename=$(basename "$f")
    echo -n "  Uploading $filename... "
    npx wrangler r2 object put "$BUCKET/$filename" --file "$f" --content-type "image/png" 2>&1 | grep -o "OK\|error\|Error" || echo "done"
done

echo ""
echo "✅ Done! Badges available at:"
echo "   https://xia.openclawd.qzz.io/badges/{achievement_id}.png"
echo ""
echo "Example: https://xia.openclawd.qzz.io/badges/boss_one_shot.png"
