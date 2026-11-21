# 10 — Reply from the UI session (2026-11-20)

Status: **10 built offline** (APIs not running). WO Photos tab; new Inspections / Defects / Inspection Checklists pages.
This closes P3 on the UI side (pending live checks).

## Done
- `apiUpload(path, FormData)` in `client.ts` (same token / 401 / problem handling; the browser sets the boundary).
- **WO Photos tab** (after Labor, saved WOs only) on the shared `ImageGallery`, now extended (backward compatible): real
  images from blob URLs (fetched through the client, revoked on change / unmount), PDF file tiles that open the blob,
  stage badge, caption, remove icon + `ConfirmDialog`. Upload dialog: file, stage (BEFORE / DURING / AFTER / INVOICE,
  default DURING), caption; JPEG / PNG / WebP / PDF ≤ 10 MB checked in the browser. Upload only with
  `fleet.workorder.manage` at the WO's branch; allowed in every status.
- **Inspection Checklists** (`/fleet/inspections/checklists`): list (name / code · kind / class · lines · status) and
  form: header (code, names, kind, asset class from the catalogue, active) + line grid (section, check, answer type,
  min / max / unit for NUMBER, default severity, photo on fail, move up / down, add / remove). Save needs tenant-wide
  `fleet.inspection.manage`. No delete.
- **Inspections** (`/fleet/inspections`): list (document / date · asset / checklist · driver / meter · result + defect
  count), filter PASS / FAIL. New form: asset → only matching active checklists → driver, km / hours (only the meters
  the asset has), remarks; lines grouped by section (PASS / FAIL / N/A buttons, number with the range shown red when
  outside, text, PHOTO as response + comment); every line must be answered and a FAIL needs a comment; `clientRef` made
  once per form and reused for retries. After saving → the read-only view (answers + defects with their actions).
- **Defects** (`/fleet/defects`): list (asset / inspection link · description · severity · status / WR link / deferred
  until · actions), default filter OPEN. Raise work request (priority from severity, changeable), Defer (date after
  today; hidden for OUT_OF_SERVICE), Resolve; a 409 → toast + refetch. Shared with the inspection view.
- Sidebar: Inspections, Defects, Inspection Checklists after Work Requests; route guards added.
- Vitest: 6 new (NUMBER range → FAIL, all lines / fail comment, answer mapping, severity → priority, checklist line
  rules, upload type / size). 157 total pass.

## Questions
1. **Defect rows have no asset code.** `DefectDto` has `assetProfileId` only, so the Defects list shows a short id.
   Please add `assetCode` (and `registrationNo`, `inspectionDocumentNo`) to `DefectDto`.
2. **No GET for one checklist.** The checklist form reads the list (`GET /inspection-templates`) and picks the row. Fine
   for now; a `GET /inspection-templates/{id}` would avoid loading all.
3. **PHOTO lines** are answered with PASS / FAIL / N/A + comment (photos come with the phone app).
4. The read-only inspection shows `response` or the value; `results[]` has no `responseType`/`unitLabel`, so units are
   not shown. Add them?

## Still to verify live
- Upload / view / remove a photo and a PDF; a 400 on a bad file. Checklist create / edit / reorder; inspection with a
  FAIL (defect created), meter readings recorded; retry with the same clientRef; defect raise WR / defer / resolve.
