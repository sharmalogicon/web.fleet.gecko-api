import type { LaborMarkupFormValues, LaborPrice } from '@/types/stock-labor-price'

export const MOCK_LABOR_MARKUP: LaborMarkupFormValues = {
  markupValueOwn: 15,
  markupValueOther: 20,
  markupClaimOwn: 10,
  markupClaimOther: 12,
}

export const MOCK_LABOR_PRICES: LaborPrice[] = [
  { laborPriceID: 1, branchID: 1, code: 'LAB-001', description: 'General Mechanic', ratePerHour: 350, overtimeRate: 525, category: 'MECHANIC', isActive: true },
  { laborPriceID: 2, branchID: 1, code: 'LAB-002', description: 'Senior Mechanic', ratePerHour: 500, overtimeRate: 750, category: 'MECHANIC', isActive: true },
  { laborPriceID: 3, branchID: 1, code: 'LAB-003', description: 'Electrical Technician', ratePerHour: 450, overtimeRate: 675, category: 'ELECTRICAL', isActive: true },
  { laborPriceID: 4, branchID: 1, code: 'LAB-004', description: 'Tire Specialist', ratePerHour: 300, overtimeRate: 450, category: 'TYRE', isActive: true },
  { laborPriceID: 5, branchID: 1, code: 'LAB-005', description: 'Forklift Technician', ratePerHour: 400, overtimeRate: 600, category: 'MECHANIC', isActive: true },
  { laborPriceID: 6, branchID: 1, code: 'LAB-006', description: 'Body & Paint', ratePerHour: 380, overtimeRate: 570, category: 'BODY', isActive: false },
]
