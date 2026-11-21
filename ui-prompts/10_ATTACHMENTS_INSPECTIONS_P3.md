# 10 — Work-order photos and the inspection web form (P3, closes the workshop MVP)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **03** (assets), **09** (work requests / orders).
Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported 2026-11-19: **71 paths, 128 schemas**).
Read the UI change policy in `ui-prompts/README.md`.

What changes on screen:
- **A.** Work order form: one extra tab **Photos** after Labor, built from the existing `<ImageGallery>` (the same
  component the accident and driver photo pages use). Nothing else on the WO form moves.
- **B–D.** Inspections have **no screen today**, so three new pages are allowed (policy: new concept). Copy the look of
  the existing list + form pages (`ListPage`, multi-line `DataTable` with max 4–6 columns, `FormLayout` sections). Add
  them to the sidebar group **Fleet Operations**, after Work Requests: *Inspections*, *Defects*, *Inspection Checklists*.

Permissions: `fleet.workorder.view` / `.manage` (photos), `fleet.inspection.perform` (fill in a checklist, see
inspections), `fleet.inspection.manage` (defects; checklists need it **tenant-wide**), `fleet.workrequest.create`
(raise a work request from a defect). Add the three routes to the route-guard map from 01.

## A. Work-order photos
| Method + path | Notes |
|---|---|
| `GET /api/fleet/work-orders/{id}/attachments` | `[{ attachmentId, stage, fileName, contentType, sizeBytes, caption, createdAt, createdBy }]` |
| `POST /api/fleet/work-orders/{id}/attachments` | **multipart/form-data**: `file`, `stage` (BEFORE / DURING / AFTER / INVOICE, default DURING), `caption` |
| `GET …/attachments/{attachmentId}/content` | the file (needs the bearer token) |
| `DELETE …/attachments/{attachmentId}` | takes it off the WO (the stored file is kept for the audit trail) |

- JPEG / PNG / WebP / PDF, **10 MB max** — check both in the browser before uploading; the API answers 400 `file` too.
- `<img src>` cannot carry the token: fetch `content` through the API client as a blob → `URL.createObjectURL`
  (revoke on unmount). PDFs show a file tile that opens the blob in a new tab.
- `ImageGallery` today has `uploadDisabled` + `onUpload`: enable upload when the caller has `fleet.workorder.manage`
  at the WO's branch, ask for the stage (small select) and an optional caption. Group or badge tiles by stage.
  Remove = one icon on the tile with `ConfirmDialog`. Uploads work in every status (photos after closing are allowed).
- The client helper `apiSend` sends JSON; add a `apiUpload(path, FormData)` beside it in `src/lib/api/client.ts`
  (same token / 401 / problem handling, no `Content-Type` header so the browser sets the boundary).

## B. Inspection checklists (`/fleet/inspections/checklists`, list + `[id]` form)
| Method + path | Permission |
|---|---|
| `GET /api/fleet/inspection-templates?kind=&active=` | perform or manage at any branch |
| `POST /api/fleet/inspection-templates` · `PUT …/{id}` (+ `rowVersion`) | `fleet.inspection.manage` tenant-wide |

Body: `templateCode` (unique, 409 when taken), `nameEn`, `nameLocal`, `inspectionKind` PRE_TRIP / POST_TRIP / PERIODIC /
TYRE / HANDOVER, `assetClass` (optional; values from `GET /assets/catalogue`), `isActive`, `items` = the **whole list in
order** (at least one). Each line: `sectionEn`/`sectionLocal`, `itemTextEn`/`itemTextLocal`, `responseType` PASS_FAIL /
NUMBER / TEXT / PHOTO, `unitLabel`, `minValue`, `maxValue` (NUMBER only; min ≤ max), `photoRequiredOnFail`,
`defaultSeverity` MINOR / MAJOR / OUT_OF_SERVICE. Lines are kept by position (answers of past inspections point at them),
so editing line 3 keeps its id; moving lines around rewrites them. No delete: switch `isActive` off.
Form: header section + an editable line grid (add / remove / move up-down).

## C. Inspections (`/fleet/inspections`, list + `new` form + read-only `[id]`)
| Method + path | Permission |
|---|---|
| `GET /api/fleet/inspections?assetProfileId=&result=PASS|FAIL&from=&to=&page=&pageSize=` | `fleet.inspection.perform` (caller's branches) |
| `GET /api/fleet/inspections/{id}` | same |
| `POST /api/fleet/inspections` | perform **at the asset's branch** |

List columns (multi-line): Document no / date · Asset / checklist · Driver / meter · Result (PASS green / FAIL red badge,
defect count).
New-inspection form: pick the asset, then a checklist (only active ones; one with an `assetClass` other than the
asset's is refused with 400 `inspectionTemplateId` — filter them out in the picker), optional driver (`/drivers`),
`meterKm` / `meterHours` (show only the meters the asset has: `meterType` on the asset), remarks. Then one row per
checklist line, grouped by section:
- PASS_FAIL → three buttons PASS / FAIL / N/A (`response`); TEXT → `valueText`; NUMBER → `valueNumber` with `unitLabel`
  and the min–max hint (outside the range counts as FAIL on the server — show it red already); PHOTO → `response` +
  `comment` for now (inspection photos come with the phone app in phase 2).
- `comment` per line, required by the screen when the answer is FAIL (the server does not insist, but the defect text
  is "<line text>: <comment>").
- **Every line must be answered** (400 `answers` "Line n is not answered").
- Send `clientRef`: a `crypto.randomUUID()` made when the form opens. A double-click or a retry after a timeout returns
  the first inspection instead of a duplicate — keep the same ref for retries, make a new one after success.

The answer is the saved inspection: `documentNo` (series **FLT_INS**; 409 "No active inspection number series" means
Setup → initialize was not run), `result`, `results[]`, `defects[]`. Go to the read-only `[id]` view, which lists the
answers and the defects with their actions (D). Meter values are stored as meter readings (source INSPECTION) and the
PM due list updates.

## D. Defects (`/fleet/defects`, list only)
| Method + path | Permission |
|---|---|
| `GET /api/fleet/defects?assetProfileId=&status=OPEN|WR_RAISED|DEFERRED|RESOLVED&page=&pageSize=` | `fleet.inspection.manage` |
| `POST /api/fleet/defects/{id}/raise-work-request` `{ priority?, reason?, rowVersion }` | manage + `fleet.workrequest.create` at the branch |
| `POST /api/fleet/defects/{id}/defer` `{ deferredUntil, reason?, rowVersion }` | manage |
| `POST /api/fleet/defects/{id}/resolve` `{ reason?, rowVersion }` | manage |

Defect: `defectId, assetProfileId, inspectionId, description, severity, status, workRequestId, deferredUntil,
deferredReason, createdAt, rowVersion`. The list comes OUT_OF_SERVICE first, newest first; default filter status OPEN.
Columns: Asset / inspection link · Description · Severity (OUT_OF_SERVICE red, MAJOR amber, MINOR grey) · Status /
WR link / deferred until · Actions.
- **Raise work request**: creates a WR with source INSPECTION; priority defaults from severity (OUT_OF_SERVICE → URGENT,
  MAJOR → HIGH, MINOR → NORMAL), the user may change it. The WR is APPROVED at once unless a WORK_REQUEST approval policy
  exists (then SUBMITTED). Show `workRequestId` as a link to `/fleet/work-requests/[id]`.
- **Defer**: date picker, must be after today (400 `deferredUntil`). OUT_OF_SERVICE defects **cannot** be deferred
  (409) — hide the button for them.
- **Resolve**: confirm dialog.
- A WR_RAISED or RESOLVED defect accepts no action except resolve (409); after any 409 refetch the row.
- Show the same actions on the inspection `[id]` view (B/C share the defect row component).

## Error handling (as in 01/09)
400 → `ApiError.forField()` next to the input (`answers`, `items`, `file`, `stage`, `deferredUntil`, …); 403 → toast
"no permission at this branch"; 409 → toast + refetch (stale `rowVersion`, duplicate checklist code, defect state).

## Done when
- [ ] WO Photos tab: list, upload (stage + caption), view, remove; blob URLs revoked.
- [ ] Checklists list + form; Inspections list, new form (all lines, clientRef), read-only view; Defects list with the
      three actions; sidebar links + route guards.
- [ ] EN + TH strings for every new text; Vitest for the answer → request mapping (FAIL rule for NUMBER), the
      severity → default priority rule and the upload size/type check; `tsc`, build and lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/10_REPLY.md`.

**This closes P3 (workshop MVP).** Next prompt (P4): stock ledger, goods requests / issues, purchasing on the existing
inventory screens. Do not commit or push unless the owner asks.
