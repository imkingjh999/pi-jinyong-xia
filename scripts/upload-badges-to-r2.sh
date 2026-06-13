#!/usr/bin/env bash
# Upload achievement badges to Cloudflare R2
# Prerequisites: wrangler CLI installed, logged in
#
# Usage:
#   1. First create the bucket:
#      wrangler r2 bucket create xia-achievement-badges
#   2. Generate badges:
#      python3 scripts/gen-achievements.py
#   3. Upload all:
#      bash scripts/upload-badges-to-r2.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BADGES_DIR="$SCRIPT_DIR/../assets/achievements"
BUCKET="xia-achievement-badges"

if [ ! -d "$BADGES_DIR" ]; then
    echo "ERROR: $BADGES_DIR not found. Run gen-achievements.py first."
    exit 1
fi

count=0
fail=0
for f in "$BADGES_DIR"/*.png; do
    [ -f "$f" ] || continue
    fname=$(basename "$f")
    echo -n "Uploading $fname ... "
    if npx wrangler r2 object put "$BUCKET/$fname" --file "$f" --content-type "image/png" --remote 2>&1 | grep -q "success\|Created\|200\|complete"; then
        echo "OK"
        count=$((count + 1))
    else
        npx wrangler r2 object put "$BUCKET/$fname" --file "$f" --content-type "image/png" --remote 2>&1
        count=$((count + 1))
    fi
done

echo ""
echo "Uploaded $count badges to R2 bucket: $BUCKET"
