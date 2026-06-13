#!/usr/bin/env bash
# Upload character avatar PNGs to Cloudflare R2
# Prerequisites: wrangler CLI installed, logged in
#
# Usage:
#   1. First create the bucket:
#      npx wrangler r2 bucket create xia-avatars
#   2. Upload all avatars:
#      bash scripts/upload-avatars-to-r2.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AVATARS_DIR="$SCRIPT_DIR/../assets/avatars-q"
BUCKET="xia-avatars"

if [ ! -d "$AVATARS_DIR" ]; then
    echo "ERROR: $AVATARS_DIR not found."
    exit 1
fi

count=0
fail=0
for f in "$AVATARS_DIR"/*.png; do
    [ -f "$f" ] || continue
    fname=$(basename "$f")
    echo -n "Uploading $fname ... "
    if npx wrangler r2 object put "$BUCKET/$fname" --file "$f" --content-type "image/png" --remote 2>&1 | grep -q "success\|Created\|200\|complete"; then
        echo "OK"
        count=$((count + 1))
    else
        echo "trying again with full output..."
        npx wrangler r2 object put "$BUCKET/$fname" --file "$f" --content-type "image/png" --remote 2>&1
        count=$((count + 1))
    fi
done

echo ""
echo "Uploaded $count avatars to R2 bucket: $BUCKET"
