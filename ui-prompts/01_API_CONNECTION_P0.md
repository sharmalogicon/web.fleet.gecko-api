# 01 — Connect the Fleet UI to the real APIs (P0 foundation)

You are the UI session for **Gecko Fleet** (`D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`, Next.js App Router).
The backend for P0 is done and running locally. Your job: replace the "no backend" shell with a real, signed-in app
that talks to the Platform API and the Fleet API. **Do not migrate screens to real data yet** (only the P0 endpoints
exist); build the plumbing every later screen will use.

Before you start: read `CLAUDE.md`, the root `TODO.md`, and this file to the end. Write your step list into
`TODO.md` first and tick it off as you go — sessions drop, the TODO is how the next one continues.

---

## 1. The architecture you are plugging into

| Piece | Local address | What it does |
|---|---|---|
| Platform API (`Gecko.Api`) | http://localhost:5100 | **Login and tokens** (`/auth/*`), branches and master data (`/api/...`) |
| Fleet API (`Gecko.Fleet.Api`) | http://localhost:5300 | Everything under `/api/fleet/*`. **Only checks tokens**, never issues them |

- The Platform API issues an RS256 access token (~15 min) and sets a refresh token as an **HttpOnly cookie on `/auth`**
  (`__Secure-gecko_rt`, SameSite=Strict, Secure). JavaScript never sees the refresh token.
- The Fleet API requires the token's `mod` claim to contain `FLEET` (tenant entitlement) → otherwise **403**.
  Each endpoint then checks a `fleet.*` permission.
- The APIs have **no CORS**. The browser must talk only to this Next.js app, which forwards calls (rewrites).

### Reference implementation — copy it, do not reinvent it
`D:\SHARMA\PROJECT\gecko\web.trucking.gecko-api` already does all of this against the same Platform API:
- `next.config.ts` — the rewrites and the `resolveOrigin()` production guard
- `src/lib/api/client.ts` — **the** API client (token in memory, single-flight refresh, retry once on 401, file downloads)
- `src/lib/api/problem.ts` — ProblemDetails → `ApiError`, offline detection
- `src/lib/contexts/AuthContext.tsx` — `AuthProvider`, `useAuth`, `holds(user, permission)`
- `src/app/[locale]/(auth)/login/page.tsx` — the login page
- `package.json` → `dev` script (https with local certificates) and `api:types` script

**Do NOT copy its locale routing.** Trucking uses `/[locale]/...` URLs and next-intl middleware. Fleet's rule
(CLAUDE.md) is: **no `/th` or `/en` in the URL**; language is switched in memory by the existing
`src/i18n/I18nContext.tsx` (cookie `gecko_lang`). Keep that. No `middleware.ts` locale handling.

**Do NOT use `next-auth`** (it is in package.json but unused). Auth is the Platform cookie flow above. Remove the
dependency once the new flow works.

---

## 2. What to build

### 2.1 Proxy (`next.config.ts`)
```
/api/fleet/:path*  → FLEET_API_ORIGIN    (default http://localhost:5300)   ← must come FIRST (more specific)
/api/:path*        → PLATFORM_API_ORIGIN (default http://localhost:5100)
/auth/:path*       → PLATFORM_API_ORIGIN
```
Same `resolveOrigin()` as trucking: env var in production (https required), local default in development.
Add `.env.example` with `PLATFORM_API_ORIGIN` and `FLEET_API_ORIGIN` (never commit `.env.local`).

### 2.2 HTTPS in development
The refresh cookie is `Secure`: over plain http the browser drops it and **every reload signs the user out**.
Change `npm run dev` to https like trucking (`--experimental-https` with `certificates/localhost*.pem`; copy the
trucking `certificates/` approach or let Next generate them). Keep port **5001**.

### 2.3 API client — `src/lib/api/client.ts` + `problem.ts`
Port trucking's files as they are (same behaviour, same names). It is the **only** module allowed to call `fetch`.

### 2.4 Auth — `src/lib/contexts/AuthContext.tsx` + login page
- `AuthProvider`: on mount call `refresh()`; if a token comes back, load `GET /auth/me`; status
  `loading | authenticated | anonymous | offline` ("offline" = API not running — show a clear banner, not the login page).
- Login page at **`/login`** (no locale segment), Gecko design system, EN/TH strings via `t()`.
  `email` field also accepts a user name. Show ProblemDetails `title`/`detail` on failure (lockout, wrong password).
- Logout in the header user menu → `POST /auth/logout`, back to `/login`.
- After login, if `me.modules` does **not** include `FLEET`, show a "Fleet is not enabled for your company" page
  (do not show the app; the API would answer 403 everywhere anyway).

### 2.5 Fleet access + route guard
`GET /api/fleet/access` returns the user's fleet permissions per branch:
```json
{ "permissions": [
    { "permission": "fleet.workorder.view", "allBranches": true,  "branchIds": [] },
    { "permission": "fleet.stock.issue",    "allBranches": false, "branchIds": ["<uuid>", "..."] },
    { "permission": "fleet.setup.manage",   "allBranches": false, "branchIds": [] }      // = not held
] }
```
- Load it once after login (React Query, `staleTime` ~5 min; refetch on branch switch is not needed — it is per user).
- Helpers: `canAnywhere(permission)`, `canAt(permission, branchId)`, `branchesFor(permission)`.
- **Route guard**: a map from each route in `src/lib/navigation.ts` to the permission that opens it
  (e.g. `/fleet/work-orders` → `fleet.workorder.view`, `/master/equipment` → `fleet.asset.view`). Hide sidebar links
  the user cannot open; a direct URL to a forbidden page shows a 403 page. The API still decides — this is UX only.
- The 43 codes and their meaning: see §5.

### 2.6 Branch context
- Branch list: `GET /api/branches` (Platform API) filtered to the branches the user can act at.
- A branch switcher in the header; the current branch in a Zustand store (persist in `localStorage` per user id,
  wrapped in try/catch). Default: the user's first branch.
- Pilot: SCT works at branch **SCT1** only for now; the UI must still support many branches.

### 2.7 React Query
Add `@tanstack/react-query` (+ devtools in development). `QueryClientProvider` in `src/components/providers.tsx`
**inside** `AuthProvider`. Defaults: `retry` only for network errors (not 4xx), `refetchOnWindowFocus: false`.
On a 401 that refresh cannot fix → clear the query cache and go to `/login`.

### 2.8 OpenAPI types
- Add `openapi-typescript` (dev). Script:
  `"api:types": "openapi-typescript ui-prompts/openapi/fleet-api.json -o src/lib/api/fleet.schema.ts && openapi-typescript ui-prompts/openapi/platform-api.json -o src/lib/api/platform.schema.ts"`
- The JSON files are provided by the backend session in `ui-prompts/openapi/`. If they are not there yet, write the
  script anyway and note it in `TODO.md`; run it when they appear.
- Generated files are never edited by hand.

### 2.9 Adapter layer (prepares the screen migration)
Every screen today reads mocks through `src/lib/hooks/use*.ts` and `src/lib/data/*.ts` with **numeric ids**
(`driverID: number`). The API uses **UUID strings** and different field names/statuses. Do not touch the screens now.
Instead, document (in `TODO.md`) the pattern each entity will follow when its API lands:
`src/lib/api/fleet/<entity>.ts` (calls + DTO→view-model mapping) → React Query hook with the **same signature** the
screen uses today → swap the hook's import. Mocks stay for entities whose API is not live (see `ui-prompts/README.md`
"Fleet API status").

### 2.10 Setup screens (the only P0 data)
A read-only **Fleet Setup** page (route `/master/fleet-setup`, permission `fleet.setup.manage` for number series):
two multi-line DataTables (house rule: stack related fields, max 4–6 columns):
- Number series: code + description · prefix/separator/date part · reset period/length · active/known.
- Settings: code · value + type · branch (tenant-wide or branch name) · description.
Both lists are **empty** today (defaults are written in P1) — design the empty state.

---

## 3. Running the APIs locally
From `D:\SHARMA\PROJECT\gecko\platform` (the owner normally starts them; ask if they are not running):
```powershell
dotnet run --project Gecko.Api -- --urls "http://localhost:5100"
dotnet run --project Gecko.Fleet.Api -- --urls "http://localhost:5300"
```
Health: http://localhost:5100/health, http://localhost:5300/health. Swagger: http://localhost:5300/swagger.

## 4. Test users (test company SCT-TEST — safe to change; never use real SCT for writes)
Password for all: `Gecko#Test2026`
| User | What it shows |
|---|---|
| `admin@sct-test.example` | TENANT_OWNER: all 43 fleet permissions, tenant-wide |
| `ops.lcb@sct-test.example` | OPS_MANAGER at SCT-LCB01 (all fleet codes except setup), VIEWER elsewhere → branch-limited views |
| `gate1.lcb@sct-test.example` | gate clerk: **no** fleet permission → empty sidebar / 403 pages |
| `admin@siamshoreside.co.th` | owner of SSS, the other company → must never see SCT-TEST data |

## 5. Permission codes (gecko_identity, module FLEET)
`fleet.setup.manage` · `fleet.asset.view/manage` · `fleet.meter.record/override` · `fleet.people.view/manage` ·
`fleet.pm.view/manage` · `fleet.workrequest.create/approve` · `fleet.workorder.view/manage/labor/approve/close` ·
`fleet.inspection.perform/manage` · `fleet.inventory.view/manage` · `fleet.stock.issue/adjust/approve` ·
`fleet.purchase.view/request/manage/approve/receive` · `fleet.tyre.view/manage` · `fleet.fuel.view/approve` ·
`fleet.incident.view/manage` · `fleet.claim.approve` · `fleet.vendorinvoice.view/manage/approve/export` ·
`fleet.recharge.release` · `fleet.compliance.view` · `fleet.cost.view` · `fleet.report.view`.
Repair tariff pages (`/tariff/*`) use **`revenue.tariff.view`** (Revenue owns those tables).

Roles that hold them: FLEET_MANAGER (all), WORKSHOP_SUPERVISOR, STOREKEEPER, PURCHASER, TECHNICIAN (labour,
inspection, work requests only), plus TENANT_OWNER (all), OPS_MANAGER (all but setup), ACCOUNTS, VIEWER (*.view).

## 6. Errors
The APIs answer errors as RFC 7807 ProblemDetails (`title`, `detail`, `status`, validation `errors{field:[msg]}`).
Show `errors` next to the fields; `409` = "changed since you loaded it, reload"; `403` = no permission at this branch.
All user-visible text goes through `t()` with keys in `en.json` **and** `th.json`.

## 7. Done when
- [ ] `npm run dev` on https; reload keeps the session; logout works.
- [ ] Owner sees the full sidebar; `ops.lcb` sees branch-limited access; `gate1.lcb` sees no fleet pages; SSS owner sees no SCT-TEST data.
- [ ] A tenant without FLEET sees the "not enabled" page.
- [ ] API down → "offline" banner, not a login loop.
- [ ] `npm run api:types` generates both schema files (or is waiting on the JSON, noted in TODO).
- [ ] Fleet Setup page renders (empty state).
- [ ] Vitest: client refresh single-flight, 401→refresh→retry, route-guard map, access helpers. `npm run build` and `npm run lint` pass.
- [ ] EN + TH strings for everything new.
- [ ] `TODO.md` updated; anything you need from the backend written in `ui-prompts/replies/01_REPLY.md`.

Do not commit or push unless the owner asks.
