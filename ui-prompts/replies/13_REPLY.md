# 13 — Reply from the UI session (2026-11-20)

Status: **13 built offline** (APIs not running). This closes P6 on the UI side (pending live checks). The local
`fleet-api.json` still has 130 paths (prompt said 131); every tyre endpoint the prompt uses is in it.

## Done
- **One adapter** `src/lib/api/fleet/tyres.ts`: `axleMapToVehicle()` turns the axle-map response into the components'
  `VehicleConfig` + `Vehicle` (body RIGID / TRACTOR / TRAILER / EQUIPMENT → rigid / tractor / trailer / rigid, axles
  in axle order, spares, fitment by position code) with the 2D and 3D geometry by wheel code; register / map tyres →
  `Tire` with the API `health`, `pressureAlert`, `costPerKm` and the tenant `thresholds`. `types/tire-axle-map.ts`
  keeps its constants only as the fallback (`tireHealth` / `pressureAlert` use the API values first).
- **A. Axle maps** (2D `format=2d`, 3D `format=3d`, bay `format=2d`): asset picker = active assets with an axle layout;
  409 → "no axle layout" + link to the asset form. 2D and 3D place wheels from `geometry2D` / `geometry3D` (3D: API z
  shifted to the scene's centre; FLAT = spare). The bay view keeps its own perspective layout (it is not a top-down
  SVG) but its data, health and alerts come from the API. Every dialog action posts ONE line to `/tyre-changes`
  (INSTALL / REPLACE / REMOVE / ROTATE (occupied target = swap) / INSPECT) with the keyed odometer as `meterKm`, then
  the map refetches. Inventory panel = `/tyres?status=IN_STOCK`. The old Undo / "Post changes" buttons are gone (each
  action is posted at once); the log lists this session's posted actions. Actions need `fleet.tyre.manage`.
- **B. Tyre profiles**: list (search server-side; brand / status / active filtered on the loaded rows; derived
  NEW / USED / RECAP / SCRAP badge + the API status badge), form tabs General / Mileage & Recap / Purchase Info /
  Equipment Installation (read-only + link to the axle map) / History (`/tyre-events?tyreId=`). Register = IN_STOCK at
  the header branch + chosen store; tread is locked after registering (it changes through inspections).
- **C. Tyre changes + maintenance**: lists on `/tyre-documents?kind=`; saved documents read-only (REPLACE shown as one
  line: old serial from the REMOVE event, new from the INSTALL event). New change: asset → its map positions; lines
  REPLACE / INSTALL / REMOVE / ROTATE with in-stock tyre, reason, destination, tread out. New maintenance: lines
  INSPECTION / REPAIR / RETREAD / RECEIVE_RECAP / SCRAP with tread before / after and cost; VAT totals on screen.
- **D. Pending recap** = `/tyres?status=AT_RECAP`; the page has no tabs, so its existing status filter now switches
  AT_RECAP / AWAITING_REPAIR. Row action **Receive from recap** → one RECEIVE_RECAP maintenance line (new tread, cost,
  recapper, VAT). **Tire-change inquiry** on `/tyre-events` (asset by code → id; document no and asset from the tyre
  documents; links to the document and the tyre).
- Removed: old tyre list / form clients, sections, hooks, `lib/data` + mock files, the axle-map mock, and the now
  unused mock-only type files of prompts 11–13.
- EN + TH strings (`tireMap.logHint` changed to "posted at once"); Vitest 9 new (map → Vehicle incl. both geometries
  and no-geometry, thresholds for register tyres, reason codes / action lines, tyreStatus derivation, REPLACE → old /
  new serial); 192 pass; `tsc` clean; lint clean on the tyre files; `next build --webpack` passes.

## Questions
1. **Action date**: the map dialog asks for a date, but `TyreChangeRequest` has none (the document is dated today).
   Should it take `documentDate` / `eventAt`, or should the dialog drop the date field?
   yes add the documentDate.
2. **Driver on the map**: `AxleMapDto` has no current driver (the vehicle bar used to show one). Add it?
  yes add it
3. **Pending recap columns**: the old page showed the recap tax no / date / vendor. A tyre has no "sent to recap"
   document or recapper; could `TyreDto` carry `lastEventAt` / `lastDocumentNo` / the recapper's party code for
   AT_RECAP tyres? And should AWAITING_REPAIR get a "Repaired" action (a REPAIR maintenance line)? 
   yes sir.. awaiting_repair should have a repaired action.
4. **Event rows → document no**: `TyreEventDto` has `tyreDocumentId` but not `documentNo` / `assetCode`, so the inquiry
   loads both document lists to join them. Could the event carry `documentNo` and `assetCode`?
   its better to have those documentNo and assetCode, perpahs this might be useful in other APIs or reports.
5. **Removal to stock** from the map sends no `warehouseId` (the dialog has no store). Does the API use the branch's
   default store? yes.. 
6. **Tyre condition** is free text in the API; the form offers GOOD / FAIR / POOR (+ any stored value). Is there a
   code list? we dont have any code list, but you can analyse what are the codes popularly used in other fleet saas model systems , and add to gecko_master lookup tables. 
7. **Tread on registered tyres** is locked after creation. Should `PUT /tyres/{id}` still accept `currentTreadMm`? yes it should

## Live checks still open
2D / 3D / bay on an asset with a layout and one without (409); install / replace / remove / rotate (swap) / inspect
from the map; register a tyre; change + maintenance documents (400 "Line n" errors); retread → receive from recap;
inquiry filters.

## Follow-up after the owner's answers (2026-11-20)
UI side done (194 Vitest pass, `tsc` clean, lint clean, build passes). The UI already sends / reads the new fields
below; until the backend adds them they are ignored (requests) or fall back (responses). **Please use these exact names**:

| Q | UI done | Backend to do |
|---|---|---|
| 1 | Map dialog date → `documentDate`; the new tyre change **and** maintenance forms now have an editable date sent as `documentDate` | Add `documentDate?: date` to `TyreChangeRequest` and `TyreMaintenanceRequest` (empty = today); date the document and its events |
| 2 | Vehicle bar shows `driverName` (else `driverCode`) | Add `driverId`, `driverCode`, `driverName` (current driver of the asset, nullable) to `AxleMapDto` |
| 3 | AWAITING_REPAIR rows get **Repaired** → one `REPAIR` maintenance line (tread optional, repair cost, vendor, VAT); new "Sent / vendor" column shows `lastDocumentNo`, `lastEventAt`, `lastPartyCode` (vendor also prefilled in the dialog) | Add `lastEventAt`, `lastEventType`, `lastDocumentNo`, `lastPartyCode` (the recapper / repairer of the last RETREAD / REPAIR-send document) to `TyreDto`; confirm a REPAIR line on an AWAITING_REPAIR tyre returns it to IN_STOCK |
| 4 | Inquiry uses the event's `documentNo` / `assetCode` and only loads the document lists while they are missing | Add `documentNo` and `assetCode` to `TyreEventDto` (all endpoints returning events: `/tyre-events`, `/tyre-documents/{id}` lines) |
| 5 | none (removal to STOCK goes to the branch's default store) | none |
| 6 | Tyre condition = code list **`FLEET_TYRE_CONDITION`** (profile form select, tyre-change line select); 14 built-in codes used until it exists | Seed it: `replies/13_tyre_condition_seed.sql` (idempotent MERGE into `gecko_master.lookup.code_list_category` / `code_list_value`, same shape as FLEET_TRADE; tenant values allowed). Not run by the UI session — the DB connection here is read-only. Optionally validate `condition` against the list |
| 7 | Tread depth on the profile form is editable again (sent as `currentTreadMm` on PUT) | Keep accepting `currentTreadMm` on `PUT /tyres/{id}` |

After the backend change: re-export `fleet-api.json`, run `npm run api:types`, and the optional types in `tyres.ts`
(`AxleMapWithDriver`, `Dated…Request`, `TyreEventWithDoc`, `TyreWithLastEvent`) can be folded into the generated ones.
