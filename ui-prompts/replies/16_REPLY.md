# 16 — Dashboard, reports, inquiries: reply from the UI session (2026-11-22)

## Done
- §A Dashboard (`src/lib/api/fleet/dashboard.ts`, `components/dashboard/DashboardView.tsx`): same layout.
  - The six cards come from `stats` (change % only when `previousValue` is given and not 0; fuel title "Fuel (Nov)", change label "vs Oct").
  - Fleet Status from `fleetStatus`; Recent Work Orders (links to the WO); Upcoming PM (days left / overdue, or km left when due by meter; "View all" → PM Due).
  - Called with the **header branch** (`branchId`).
  - `costThisMonth` / `costLastMonth` are **not shown**: the dashboard has no place for them (question 1).
- §B Reports (`src/lib/api/fleet/reports.ts`, `components/reports/useReportScreen.ts`):
  - Sidebar ids = catalogue codes; titles from the catalogue.
  - The filter fields shown come from the report's `params` (`PO_REPORT_IDS` / `TIRE_REPORT_IDS` removed).
  - Generate runs `format=json`. The preview formats each cell by its column's `format` (dates in Thai time) and `align`, shows `totals` as a bold last row and the "narrow the filters" note when `truncated`.
  - **Export PDF / Excel** are enabled (same filters, file download).
  - Filter mapping: "All" is left out; category / status are upper-cased, spaces become `_`.
  - The Stock Movement report keeps its own component but runs `stock-movement-report` (item / document → `search`, movement type → `status`, plus the date range).
- §C Inquiries: one generic `components/inquiry/InquiryView.tsx` on `GET /inquiry/{code}`.
  - Each page keeps its own URL filters, mapped as the prompt says. WIP customer → `search` when no WO no is given.
  - API columns, PDF / Excel export, WIP rows with `daysOpen` > 7 in orange.
  - The tire-changes page now reads `tyre-changes`; the prompt 13 tyre-events inquiry view is removed.
  - The inquiry route guards are now `fleet.report.view` (they were the module view permissions).
- §D Cost: no screen (the Service Cost Summary report is the cost view).
- §E: not placed (questions 2–3).
- Old inquiry clients and data mocks removed, plus 6 mock files that nothing used any more.
- EN + TH: 18 keys added.
- Checks: tsc clean; Vitest 234 pass (formatter, params → fields / query, stats → cards / change %, fleet status, days left); lint clean on the changed files; build passes.

## Questions
1. **Dashboard cost figures** — show "Cost this month / last month" (needs `fleet.cost.view`)? It would need a seventh card or a small line under Fleet Status: owner to choose, or leave it out.
2. **Equipment "Cost" tab** (§D) — wanted? It would use `/cost/entries` + `/cost/monthly`. Not built (UI policy).
3. **Driver incident history** (§E) — the driver form has General / License / Emergency Contact tabs and no free spot. Add an "Incidents" tab? Not built.
4. **Dashboard branch** — the dashboard uses the header branch. Should a tenant-wide user also have an "all branches" choice (no `branchId`)?
5. **Inquiry tables** now show the API's columns (one value per column) instead of the old multi-line cells. OK, or should the catalogue's columns be grouped into the old multi-line layout?

## Still open (needs the APIs running)
- LIVE checks: dashboard numbers vs the lists, each of the 19 reports (preview + PDF + Excel), the 5 inquiries + export, the truncated note (> 5,000 rows).
