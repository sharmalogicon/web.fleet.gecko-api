# 09 — Reply from the UI session (2026-11-20)

Status: **09 built offline** (APIs not running). Work Requests and Work Orders lists + forms on the API.

## Done
- **Work Requests** (`workRequests.ts`, 5 Vitest): field map as listed; status read-only with the mapping of the prompt
  (approved / rejected badges, `workOrderNo` link); the status filter asks the API for each matching status and splits
  CONVERTED into IN PROGRESS / COMPLETED by `workOrderStatus`. Toolbar: Save · Submit (a new request is saved with
  `submit: true`; an existing draft is saved then submitted) · Approve / Reject (reason required) · Convert (dialog: type,
  repair site, "truck stays off the road"; opens the new WO) · Cancel. Equipment / Billing Customer / Vendor Code use
  suggestion inputs (assets, `/api/master/parties`, `/api/master/suppliers`); Vendor Name shows the supplier's name.
  The old "Cancelled" checkbox is read-only (the Cancel action). Source, meters and tasks are sent back as read.
- **Work Orders** (`workOrders.ts`, 8 Vitest): header map as listed; status read-only (on hold / closed badges,
  INVOICED = `billingStatus` BILLED). Toolbar moves per status: Open · Start · Put on hold (reason code) · Complete
  (dialog asks meter-out km / hours, saved on the header first) · Close / Reopen (`fleet.workorder.close`) · Cancel;
  Approve / Reject when `approvalStatus` PENDING. A 409 on Open → "needs approval" toast; `warning` → toast.
  New "Status log" tab. Category select = `woType`; the tyre checkbox sets TYRE; new inputs: Meter Out (km) and
  "Truck stays off the road". Totals (parts, labour, discount, VAT, grand total, cost) read-only from the API.
- **Line grids are now editable** (shared `LineItemsEditor`), sent whole with each line's `id`:
  Services → `tasks` (service task, description, status, remarks; parts/labour/discount amounts read-only);
  Parts → `parts` (task position, stock code → `itemId` STOCK or free text DIRECT_PO, UoM, qty, unit price → `unitCost`
  and `charge.unitPrice` when billable, discount); Labour → `labor` (task position, charge code, technician or trade,
  start / end, std / actual hours; rate and total from the API). Complaint / cause / correction, PM links and time band
  are kept from what was read; sublets / sundries sent `null`. Lines editable only in DRAFT / OPEN / IN PROGRESS / ON HOLD.
- `/fleet/work-orders/monitoring` (Kanban) still reads the mock (not in this prompt).

## Questions
1. **Labour price.** The prompt says billable lines carry `unitPrice: <screen price>`. The labour grid's only price
   column is the cost rate the API returns, so labour lines are sent billable with `unitPrice: null` (+ the screen's
   discount and charge code). Is the labour price meant to come from the repair tariff (P5)?
2. **WO approval permission.** Approve / Reject show for users holding `fleet.workorder.approve` at the branch; the
   real permission is the WORK_ORDER policy's `requiredPermission`. Could the WO DTO say whether the caller may approve
   (`canApprove`)?
3. **Repair site** is not on the form: VENDOR when a vendor code is set (MIXED / ROADSIDE kept), else IN_HOUSE. OK?
4. Type filter on the WO list is applied on the loaded rows (no `woType` query parameter). Add one?

## Still to verify live
- WR: create, submit (with and without a policy), approve, reject, convert, cancel.
- WO: create, Open (and the "needs approval" path), Start, hold, complete with meter-out, close, reopen, cancel;
  lines add / change / remove; billable lines with a billing customer; status log; warning toast.
