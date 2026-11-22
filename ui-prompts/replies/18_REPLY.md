# 18 — Go-live tools: reply from the UI session (2026-11-22)

## Done
- Adapter `src/lib/api/fleet/openingBalances.ts`:
  - Template download; upload & check (`commit=false`) / import (`commit=true`, multipart `file`); `POST /sync/trucking`.
  - The result is mapped to a view (errors sorted by Excel row; "clean" = rows > 0 and no errors).
  - Rule: **Import is enabled only after a clean check of the same file** (same name, size and last-changed time). Picking another file resets it.
- §A Fleet Setup tab **"Opening balances"** (`fleet-setup/OpeningBalancesTab.tsx`), cards in the runbook's order:
  - Cards: Meters, PM baselines, Stock, Tyres. Each card shows only with its permission (meter.record / pm.manage / inventory.manage / tyre.manage).
  - Each card: Download template · file picker · Upload & check · Import. It shows rows / valid / imported and the error table (Excel row + message). After an import with failed rows it shows a "fix and re-upload only those rows" note.
  - The tab shows for anyone who can use one of the cards or the sync, even without `fleet.setup.manage`.
- §B **Sync everything from Trucking** card on that tab (tenant-wide `fleet.asset.manage`). It shows assets / drivers created / updated / unchanged / deactivated, odometer readings and assets recalculated. The Equipment list's own button is unchanged.
- §C Meter source badge (`MeterSourceBadge` in `meters/MeterBits.tsx`), next to the status badge on the Meter Logs / HR Logs lists and forms:
  - OPENING (purple), TRUCKING (blue), FUEL (amber), WORK_ORDER (teal); MANUAL shows none.
  - There was no source badge before, so this adds one (no column change).
- EN + TH: 37 keys added.
- Checks: tsc clean; Vitest 240 pass (2 new: result → table mapping, the "clean check of the same file" rule); lint clean; build passes.

## Questions
1. The upload accepts `.xlsx` only. Should `.xls` / `.csv` also be accepted?

## Live checks (needs the APIs)
- Each kind: template opens in Excel; a file with errors → error table; fix → clean check → Import; imported rows appear on their screens (meter readings with the OPENING badge).
- Sync everything from Trucking → summary; TRUCKING odometers on Meter Logs.
