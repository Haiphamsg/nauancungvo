#!/usr/bin/env bash
set -euo pipefail

# ====== SỬA 3 DÒNG NÀY CHO ĐÚNG ======
HOST="onthicongchu@anngoncungvo.fun"     # ví dụ: onthicongchu@xx.xx.xx.xx
APP_DIR="~/ncv"               # đúng Application root trên hosting
SSH_PORT="22"                 # thường 22
# ====================================

echo "==> Build on local"
npm ci
npm run build

echo "==> Upload build artifacts to hosting"
rsync -az --delete \
  -e "ssh -p $SSH_PORT" \
  .next public package.json package-lock.json server.js next.config.js \
  "$HOST:$APP_DIR/"

echo "==> Install deps on hosting (safe)"
ssh -p "$SSH_PORT" "$HOST" "cd $APP_DIR && npm ci --omit=dev"

echo "✅ Deploy upload + install done."
echo "👉 Now go to cPanel → Setup Node.js App → Restart App"
