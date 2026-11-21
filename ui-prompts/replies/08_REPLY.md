# 08 — Reply from the UI session (2026-11-20)

Status: **08 built offline** (APIs not running). Meter Logs / Meter HR Logs / PM Scheduler on the API; new PM Due page.

## Done
- Adapter `src/lib/api/fleet/meters.ts`: KM → `km`, HOUR → `hours`, BOTH → both in ONE request; the asset's `meterType`
  decides the allowed types (KM, HOUR, KM_HOUR → all three, NONE → none). Reading time from a datetime input → ISO. 6 Vitest.
- **Meter Logs** = `kind=KM` (the Meter Type filter HOUR switches the list to hour readings), **Meter HR Logs** =
  `kind=HOUR`. Same columns; the status badge (VALID / SUSPECT / ACCEPTED / REJECTED / REVERSED / CANCELLED) sits in the
  value cell with `suspectReason` as tooltip. Row actions: View, and with `fleet.meter.override` Accept / Reject (SUSPECT)
  or Reverse (VALID / ACCEPTED), each with a reason dialog. No edit / delete anywhere.
- New reading: Equipment Code and Driver Name stay text inputs with suggestions (`/assets?search=`, `/drivers?search=`)
  and must match a listed code; the type select offers only what the asset allows; the current km / hours are shown under
  the code. HR form: "Meter Reading (km)" takes the km and "Total Hours (cumulative)" the hour meter; distance / working
  hours / totals are read-only (worked out by the API). A SUSPECT answer gives a warning toast with the reason.
- Saved reading opens read-only (same fields) with the actions in the header. **"Meter replaced" (segments) skipped**: the
  asset form has no meter section.
- **PM Scheduler** ⇄ `pm-programs`: field map as listed; Schedule No is typed on create (required, no series) and fixed
  after. The **Services tab is now an editable grid** (task select, interval km, remarks; description from the task) — the
  old tab was a read-only table and a new schedule could never get tasks. Hours / days intervals, parts and labour are sent
  back as read for rows that keep their task. Equipment tab: Add (modal now lists API assets) → `POST …/assignments` from
  today; Remove → `PUT /pm-assignments/{id}` `activeTo` = today; only assignments in force are listed (From / To columns
  replace Brand / Customer). Delete hidden. 6 Vitest.
- **PM Due** (`/fleet/pm-due`, menu after PM Scheduler, guard `fleet.pm.view`): asset · schedule + task · last done (date,
  km, hours, source) · next due with left / late per measure (red when late) · status badge. Filters: search, status,
  branch, "Due or late only" (default on). "Set last done" dialog (date + km + hours) with `fleet.pm.manage` at the
  branch; "Recalculate" with tenant-wide `fleet.pm.manage`.

## Questions
1. **`GET /api/fleet/meter-readings/{id}` is missing.** A saved reading can only be opened from the list (the row is
   cached); a bookmarked / reloaded reading page says "open it from the list". Please add the GET.
2. PM programs: is `programCode` meant to come from a number series later? Today the user types it.
3. Assignments: "Remove" ends the assignment today. An assignment added and removed the same day ends with
   `activeTo = activeFrom`; is that accepted, or should same-day removal be refused?
4. Meter list paging: one page of 200 readings per filter. A busy fleet will need the date filter; should the list
   default to the last 30 days?

## Still to verify live
- KM / HOUR / BOTH readings (2 rows back for BOTH), a SUSPECT reading accepted and rejected, a reversal; PM program
  create / edit with tasks; add / remove equipment; PM Due list, baseline, recalculate.
