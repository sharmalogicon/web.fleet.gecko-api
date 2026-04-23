# CLAUDE.md - Fleet Angular web app to Next.js Conversion

## Project Overview

Converting a legacy angular web based fleet application to a modern Next.js web application with multi-lingual support.

## Source Application
- **Framework**: angular
- **Language**: typescript
- **Files to analyze**: `*.html` files contain UI definitions
- **Location**: `D:\SHARMA\PROJECT\DMS PROJECT 08102022\dms.web\dms.web\src` 

## Target Application
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Gecko Design System (existing)
- **Location : "D:\SHARMA\PROJECT\gecko\design-system\gecko-design-system.css"
- **i18n**: next-intl or react-i18next
- **State**: React Query + Zustand

## Design System Reference
Use the existing Gecko project design system located at: "D:\SHARMA\PROJECT\gecko\design-system\gecko-design-system.css"

Import these from Gecko:
- Color tokens
- Typography scale
- Spacing system
- Component library (Button, Input, Select, Card, Table, etc.)
- Layout patterns

---

## Analysis Commands

### 1. Inventory All web Forms
```bash
claude "Scan the codebase and create a complete inventory of all Web pages. For each .html file found, extract:
- class name
- title 
- Parent form 
- All controls with types
- Menu items and toolbar buttons
- Context menus

Output as a markdown table sorted by module/folder."
```

### 2. Extract i18n Strings
```bash
claude "Extract all hardcoded strings from the WinForms that need translation:
- titles 
- Label texts 
- Button texts 
- Column headers
- ToolTips
- MessageBox texts
- Menu item texts
- Error messages

Output as a JSON structure ready for i18n:
{
  'formName': {
    'title': 'Form Title',
    'labels': { 'lblCustomer': 'Customer' },
    'buttons': { 'btnSave': 'Save' },
    ...
  }
}"
 
 

### i18n Strings
| Key | English | Location |
|-----|---------|----------|
| form.title | "Gate In Entry" | this.Text |
| lbl.customer | "Customer" | lblCustomer.Text |
| btn.save | "Save" | btnSave.Text |

### Proposed Next.js Structure
- **Route**: `/operations/gate-in/[id]`
- **Components**: 
  - CustomerAutocomplete (Gecko)
  - VesselSelect (Gecko)
  - ContainerDataTable (Gecko)
- **API Endpoints**:
  - GET /api/gate-in/{id}
  - POST /api/gate-in
  - GET /api/lookup/vessels
  - GET /api/lookup/customers

### Gecko Components to Use
- `<Card>` for sections
- `<Autocomplete>` for lookups
- `<DataTable>` for grids
- `<DatePicker>` for dates
- `<Button variant="primary">` for actions
```

---

## i18n Structure
use a i18n json file for each language and use angular type translators to dynamically change the language in memory . do not use /th or /en in the url.

 