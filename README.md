# NCV MVP setup

Supabase-backed Next.js app for the Vietnamese family cooking MVP.

## Setup
- Install dependencies: `npm install`
- Copy `.env.local.example` to `.env.local` and fill in values:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser/client components.
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` must stay on the server only (never expose the service role key to the browser or logs).
- Start dev server: `npm run dev` (opens on http://localhost:3000)

## Verify Supabase connectivity
- With the dev server running, hit the health endpoint:
  - Browser: http://localhost:3000/api/health
  - CLI: `curl http://localhost:3000/api/health`
- Expected JSON: `{ ok: true, recipeCount: <number> }` or an error payload if Supabase is unreachable.

## Notes
- Keep the service role key out of any client code and never commit real secrets. Use the provided server-side Supabase client helper for privileged operations.

## API endpoints (server-only)
- Ingredients search/list: `GET /api/ingredients`
  - Query params: `q` (search string), `group` (`protein|vegetable|carb|spice_core|spice_optional|other`)
  - Example: `curl "http://localhost:3000/api/ingredients?q=tofu"`
- Recommend recipes: `POST /api/recommend`
  - Body: `{"selected_keys":["chicken","onion"],"prefer_tag":"weekday","limit_n":10,"missing_core_allow":2}`
  - Example: `curl -X POST -H "Content-Type: application/json" -d '{"selected_keys":["chicken","onion"]}' http://localhost:3000/api/recommend`
- Recipe detail by slug: `GET /api/recipe/<slug>`
  - Example: `curl http://localhost:3000/api/recipe/garlic-chicken`

## Production env vars
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for browser)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose)
- Ensure `.env` files are not checked into git and are provided to your process manager/container.

## Deployment options
### Option 1: PM2 (Node/VPS)
- Build: `npm run build`
- Start: `npm run start`
- PM2: `pm2 start npm --name "ncv-mvp" -- start`
- Ensure env vars are set in the PM2 ecosystem or the shell.

### Option 2: Docker
- Build image: `docker build -t ncv-mvp .`
- Run: `docker run -p 3000:3000 --env-file .env.local ncv-mvp`
- See `.dockerignore` and `Dockerfile` in the repo.

### Network/proxy checklist
- Open TCP port 3000 (or your mapped port) on the server firewall.
- Put a reverse proxy (e.g., nginx) in front to terminate TLS and forward to the Node app.
- Configure proxy timeouts/headers appropriately for Next.js/Node defaults.

## Data curation and SQL
- Curated top 30 recipes live in `data/curation/top30.json`.
- SQL scripts are in `sql/` and can be run in Supabase SQL Editor or `psql`:
  - Apply curated ingredients/steps: run `sql/06_apply_top30_curation.sql`
  - Expand ingredient aliases: run `sql/07_expand_aliases.sql`
  - Update recommend_recipes scoring: run `sql/08_update_recommend_recipes.sql`
- Supabase SQL Editor: open the file, copy/paste, and execute. Re-runnable safely.
- Adding more curated recipes later: append to `data/curation/top30.json`, then extend `06_apply_top30_curation.sql` with new `VALUES` rows (slug, core/optional arrays, steps), keeping the same DO block structure.

## Smoke test
- Run API smoke checks locally (requires dev server running): `npm run smoke`

# Run deploy.sh
