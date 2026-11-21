# 05 — Drivers on the real API (P1): SAME SCREENS, REAL DATA

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done. Regenerate the types (`npm run api:types`;
`fleet-api.json` re-exported 2026-11-19, 27 paths, response types included). Read the UI change policy at the top of `ui-prompts/README.md`.

**Do not redesign anything.** The Drivers list (`/master/drivers`), the driver form (`/master/drivers/[id]`, sections
General / License / Emergency contact) stay exactly as they are: same tabs, fields, labels, layout. You only swap the
data source from mock to the API, make some fields read-only, and add one button on the list ("Sync from Trucking").
The Images page (`/master/drivers/[id]/images`) stays on mock (no API yet).

## Two kinds of driver
- `driverSource = "TRUCKING"`: a copy of a Trucking driver. Code, name, nickname, licence class / expiry, employment,
  employer, hire / release dates and status belong to Trucking: show them **read-only** (same inputs, disabled) with a small
  "From Trucking" badge next to the title. Fleet still edits position, standard / overtime rate, fuel card and remarks.
- `driverSource = "FLEET"`: a driver Trucking does not hold (yard / forklift operators). Every work field is editable.

## Endpoints (Fleet API)
| Method + path | Permission | Notes |
|---|---|---|
| `GET /api/fleet/drivers/catalogue` | `fleet.people.view` | sources, employment types, statuses |
| `GET /api/fleet/drivers?search=&source=&status=&branchId=&includePool=&page=&pageSize=` | `fleet.people.view` | `PagedResult`; a branch user also sees pool drivers (`branchId` null) |
| `GET /api/fleet/drivers/{id}` | `fleet.people.view` | |
| `GET /api/fleet/drivers/{id}/personal` | `fleet.people.manage` at the driver's branch | personal data, read live from Trucking; **never cache it** (no React Query persistence, `staleTime: 0`, drop it when the form closes) |
| `POST /api/fleet/drivers` | `fleet.people.manage` at the branch | creates a FLEET driver |
| `PUT /api/fleet/drivers/{id}` | `fleet.people.manage` | whole record + `rowVersion`; on a TRUCKING driver only the Fleet fields are applied |
| `POST /api/fleet/drivers/sync-from-trucking` | `fleet.people.manage` tenant-wide | returns `{ created, updated, unchanged, deactivated }` |

No delete: a driver who leaves is set `INACTIVE`. Hide the Delete action if the screen has one (do not remove it from the code).

## Field mapping (existing form field → API)
| Form field (`types/driver.ts`) | API | Notes |
|---|---|---|
| `driverCode` | `driverCode` | |
| `driverName` | `fullName` | |
| `status` ACTIVE / ON LEAVE / INACTIVE / TERMINATED | `status` ACTIVE / LEAVE / INACTIVE | TERMINATED saves as INACTIVE (+ `leftOn`); show TERMINATED for INACTIVE with a `leftOn` in the past |
| `dateHire`, `dateRelease` | `hiredOn`, `leftOn` | |
| `position` | `positionTitle` | |
| `standardRate`, `overtimeRate` | `costPerHour`, `otCostPerHour` (+ `currencyCode`, default the tenant currency, THB) | when `ratesHidden` is true show the inputs empty + disabled |
| `fuelCard` | `fuelCardNo` | one card, one driver (409) |
| `licenseExpiryDate` | `licenceExpiryDate` | |
| `remarks` | `remarks` | |
| (none today) | `nickname`, `licenceClass`, `employmentType`, `employerPartyCode`, `userId`, `branchId` | send what you read; put no new inputs on the form |
| `licenseNo` | personal: `licenceNo`, else `"•••• " + licenceNoLast4` | read-only |
| `idNo` | personal: `nationalIdNo` | read-only |
| `mobilePhoneNumber` | personal: `mobile` | read-only |
| `address1` | personal: `address` (one text) | read-only; `address2`, `state`, `postCode`, `countryCode` stay empty + disabled |
| `dob`, `ssNo`, `phoneNumber`, `faxNumber`, `emailID` | personal: `birthDate`, `socialSecurityNo`, `phone`, `fax`, `email` | read-only (owner 2026-11-19: now held encrypted in Trucking) |
| Emergency contact section: `contactPerson` (+ its phone, relation if the section shows them) | personal: `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelation` | read-only |

**Personal fields.** Call `/personal` only when the user has `fleet.people.manage` (from `/api/fleet/access`); otherwise
leave those fields empty + disabled. Trucking holds them encrypted and decrypts them for this call (each view is logged in
Trucking's audit trail, so do NOT call it for the list, only when a driver's form opens). When `valuesAvailable` is false
(the server has no key yet, e.g. Azure before the owner adds it), show "On file in Trucking" in a field whose `…OnFile` flag
is true. `extraOnFile` covers birth date, SS no, phone, fax, e-mail and the emergency contact. `heldIn = "NONE"` (FLEET
driver): leave the fields empty + disabled. All personal fields are read-only in Fleet; they are edited in Trucking
(`PUT /api/trucking/drivers/{id}/personal` on the Trucking API — not part of this prompt).

## List
Same columns and multi-line rows as today. Data from `GET /drivers`; the source shows as a small badge in the code cell
("Trucking" / "Fleet"). Filters (existing ones): search, status, branch. Add one button "Sync from Trucking" next to the
existing "New" button, visible only with tenant-wide `fleet.people.manage`; after it runs, show the four counts in a toast
and refresh the list. "New" creates a FLEET driver.

## Done when
- [ ] List, form, create, edit, sync work on the API (400 field errors on the inputs, 409 toast); TRUCKING drivers read-only as above.
- [ ] Personal data shown as above, never cached; hidden without the permission.
- [ ] EN + TH strings for the new texts only; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/05_REPLY.md`.

Do not commit or push unless the owner asks.
