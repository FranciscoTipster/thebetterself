#!/bin/bash
# Deploys the site to the public Supabase Storage bucket "site".
# Usage: tools/deploy-storage.sh            (needs the temporary deploy policy from app/supabase/03-hosting.sql)
set -e
cd "$(dirname "$0")/.."
URL="https://yieancdskfefxorzndzx.supabase.co"
KEY="$(grep -o "SUPABASE_ANON_KEY: '[^']*'" app/config.js | cut -d"'" -f2)"
mime() { case "${1##*.}" in html) echo text/html;; css) echo text/css;; js) echo application/javascript;; json) echo application/json;; svg) echo image/svg+xml;; png) echo image/png;; jpg|jpeg) echo image/jpeg;; webp) echo image/webp;; mp4) echo video/mp4;; ico) echo image/x-icon;; txt|md) echo text/plain;; *) echo application/octet-stream;; esac; }
n=0; fail=0
while IFS= read -r f; do
  rel="${f#./}"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/storage/v1/object/site/$rel" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "x-upsert: true" -H "cache-control: 60" \
    -H "Content-Type: $(mime "$f")" --data-binary "@$f")
  if [ "$code" = "200" ]; then n=$((n+1)); else fail=$((fail+1)); echo "FAILED $code $rel"; fi
done < <(find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.webp' -o -name '*.mp4' \) \
  -not -path './tools/*' -not -path './app/supabase/*' -not -path '*/_review/*' -not -path '*/.claude/*' | sort)
echo "uploaded: $n  failed: $fail"
echo "site: $URL/storage/v1/object/public/site/index.html"
