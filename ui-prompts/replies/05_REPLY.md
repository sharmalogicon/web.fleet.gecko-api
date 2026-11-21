# 05 — Reply from the UI session (2026-11-20)

Status: **05 built offline** (APIs not running). Same Drivers list, form and sections; data from `/api/fleet/drivers`.

## Done
- Adapter `src/lib/api/fleet/drivers.ts`: the field map of the prompt; status ACTIVE / ON LEAVE / INACTIVE / TERMINATED ⇄
  ACTIVE / LEAVE / INACTIVE (TERMINATED = INACTIVE + `leftOn`, today when empty; shown for INACTIVE with a past `leftOn`);
  fields with no input (nickname, licence class, employment, employer, login, branch) sent back as read; currency THB with
  rates, none without. 12 Vitest.
- **Personal data**: `GET /{id}/personal` only on the form, only for a TRUCKING driver, only with `fleet.people.manage`
  at the driver's branch (tenant-wide for a pool driver). Query `staleTime 0`, `gcTime 0`, no retry / refetch: dropped when
  the form closes. Fields are read-only; "On file in Trucking" where `valuesAvailable` is false and the `…OnFile` flag is
  set; empty for FLEET drivers. Without the permission a small note says why the fields are empty.
- TRUCKING drivers: code, name, licence expiry, hire / release dates and status disabled + "From Trucking" badge next
  to the title (new optional `titleBadge` on FormLayout). Position, rates, fuel card, remarks editable. `ratesHidden` →
  rate inputs empty + disabled (and the stored rates sent back unchanged).
- List: same columns; source badge ("Trucking" / "Fleet") in the code cell; branch filter added next to status (the
  prompt lists search, status, branch); "Sync from Trucking" for tenant-wide `fleet.people.manage` (four counts in a toast,
  list refreshed); "New" creates a FLEET driver at the header's branch; Delete hidden on list and form.
- Images page keeps the mock gallery, now loads the driver by UUID (API drivers show no photos until an image API exists).
- 400 under the inputs (`fuelCardNo` → Fuel Card …), 409 toast (stale version or fuel card already used) + reload.

## Notes / questions
1. **List columns use personal data today**: the "License" cell showed the licence number and "Contact" the phone. The
   prompt says never to read personal data for the list, so the License cell now shows the **licence class** (+ expiry)
   and Contact shows "—" (+ position). OK, or should the list carry `licenceNoLast4` / a masked phone in `DriverDto`?
2. **Emergency section** shows only "Contact Person" and "Mobile" (the Mobile input is `mobilePhoneNumber`, which your
   table maps to the driver's own `mobile`). So `emergencyContactPhone` / `Relation` are not shown anywhere. Should the
   section's Mobile be the emergency phone instead?
3. E-mail on the form is no longer validated (read-only, may read "On file in Trucking"). The hire < release rule now
   allows the same day (API: only "left before hired" is an error).
4. Tenant currency: rates default to THB. Should it read `BASE_CURRENCY` from `/setup/settings/effective`?

## Still to verify live
- List / filters / sync, create a FLEET driver, edit a TRUCKING driver (only Fleet fields change), personal data with
  and without `fleet.people.manage`, `valuesAvailable=false` on Azure, fuel card 409.
