# 06 — Suppliers (P1): the Transporters page on the real API, same screen

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done. Regenerate the types (`npm run api:types`;
`platform-api.json` re-exported 2026-11-19, 408 paths). Read the UI change policy at the top of `ui-prompts/README.md`.

Gecko now has a **SUPPLIER** party role (gecko_master): parts and tyre shops, outside workshops, towing, insurers,
transport subcontractors. Suppliers live on the **Platform API** (master data), not the Fleet API — the proxy already
sends `/api/*` to 5100.

**Owner default (2026-11-19, may change):** the existing **Transporters** page (`/master/transporters`) becomes the list of
suppliers in the category **TRANSPORT**. Same list, same form, same labels — only the data source changes. Do not add a
new Suppliers page; later phases (purchase orders, vendor invoices) pick suppliers through a lookup on their own forms.

## Endpoints (Platform API)
| Method + path | Permission | Notes |
|---|---|---|
| `GET /api/master/suppliers?search=&category=&status=&includeInactive=&page=&pageSize=` | `mdm.supplier.view` (tenant-wide) | `PagedResult<SupplierResponse>`; for this page send `category=TRANSPORT` |
| `GET /api/master/suppliers/{partyCode}` | `mdm.supplier.view` | |
| `POST /api/master/suppliers` | `mdm.supplier.manage` | creates the party (code from the PARTY_CODE series) + supplier role; 201 |
| `PUT /api/master/suppliers/{partyCode}` | `mdm.supplier.manage` | `terms` replaced as a whole + `rowVersion`; party fields optional (see below) |

Permissions come from the Platform token (`/auth/me` permissions), like the tariff pages. PURCHASER, FLEET_MANAGER,
OPS_MANAGER and the owner manage suppliers; storekeepers, supervisors, accounts and viewers only read.
No delete on this page (a party is deleted on the party screen); set the transporter inactive instead.

## Field mapping (existing form → API)
| Form field (`types/transporter.ts`) | API | Notes |
|---|---|---|
| `transporterName` | `nameEn` | |
| `registrationNo` | `registrationNo` | |
| `emailID` | `email` | |
| `mobileNo` | `phone` | |
| `billingAddress` | `address` | |
| `isActive` | `isActive` | |
| (id) | `partyCode` | use the code in URLs instead of the old numeric id |

**Create:** `POST { nameEn, registrationNo, email, phone, address, terms: { categories: ["TRANSPORT"] } }`.
**Edit:** `PUT { terms: <the terms you read, unchanged, with categories kept>, rowVersion, nameEn, registrationNo, email, phone,
address, isActive, partyRowVersion }`. If the response is **403** with "is also a customer …", the party has other roles:
show the message and keep the form read-only for those fields (they are edited on the party screen).
`otherRoles` in the response tells you this in advance — disable the party fields when it is not empty.

The terms (`paymentTermCode`, `creditTermDays`, `withholdingTaxCode`, `leadTimeDays`, `minOrderAmount`/`minOrderCurrency`,
`erpBpCode`, `rating`, `supplierStatus` APPROVED / ON_HOLD / BLOCKED + `statusReason`) have no inputs on this form today:
send back what you read. Field errors come back as `terms.<field>`.

## Done when
- [ ] Transporters list + form read and write through the API; screen looks exactly as before.
- [ ] 400 / 403 / 409 handled; EN + TH strings for new messages only; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/06_REPLY.md`.

Do not commit or push unless the owner asks.
