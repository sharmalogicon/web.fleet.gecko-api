import type { Driver } from '@/types/driver'

let _store: Driver[] | null = null

function getStore(): Driver[] {
  if (!_store) _store = [...MOCK_DRIVERS_SEED]
  return _store
}

export function getMockDrivers(): Driver[] {
  return getStore()
}

export function upsertMockDriver(driver: Driver): void {
  const store = getStore()
  const idx = store.findIndex((d) => d.driverID === driver.driverID)
  if (idx >= 0) store[idx] = driver
  else _store = [...store, driver]
}

export function removeMockDriver(id: number): void {
  _store = getStore().filter((d) => d.driverID !== id)
}

const MOCK_DRIVERS_SEED: Driver[] = [
  {
    driverID: 1, branchID: 1, driverCode: 'DRV-001', driverName: 'Somchai Jaidee',
    status: 'ACTIVE', dob: '1985-03-15', position: 'Senior Driver',
    idNo: '1234567890123', ssNo: 'SS-001', dateHire: '2015-06-01',
    licenseNo: 'TH-LIC-001', licenseExpiryDate: '2026-06-01',
    phoneNumber: '081-234-5678', mobilePhoneNumber: '081-234-5678',
    emailID: 'somchai@fleet.com', address1: '123 Main St', address2: 'Bangkok',
    state: 'Bangkok', countryCode: 'TH', postCode: '10110',
    standardRate: 500, overtimeRate: 750, remarks: 'Experienced driver',
    contactPerson: 'Malee Jaidee', fuelCard: 'FC-001',
  },
  {
    driverID: 2, branchID: 1, driverCode: 'DRV-002', driverName: 'Wanchai Srisuk',
    status: 'ACTIVE', dob: '1990-07-22', position: 'Driver',
    idNo: '2345678901234', dateHire: '2018-01-15',
    licenseNo: 'TH-LIC-002', licenseExpiryDate: '2025-12-01',
    phoneNumber: '082-345-6789', mobilePhoneNumber: '082-345-6789',
    emailID: 'wanchai@fleet.com', standardRate: 450, overtimeRate: 675,
  },
  {
    driverID: 3, branchID: 1, driverCode: 'DRV-003', driverName: 'Apirak Thongsuk',
    status: 'ON LEAVE', dob: '1988-11-10', position: 'Driver',
    idNo: '3456789012345', dateHire: '2019-03-01',
    licenseNo: 'TH-LIC-003', licenseExpiryDate: '2027-03-01',
    phoneNumber: '083-456-7890', mobilePhoneNumber: '083-456-7890',
    standardRate: 450, overtimeRate: 675,
  },
  {
    driverID: 4, branchID: 1, driverCode: 'DRV-004', driverName: 'Preecha Kaewkla',
    status: 'ACTIVE', dob: '1982-05-05', position: 'Senior Driver',
    idNo: '4567890123456', dateHire: '2012-08-20',
    licenseNo: 'TH-LIC-004', licenseExpiryDate: '2024-08-20',
    phoneNumber: '084-567-8901', mobilePhoneNumber: '084-567-8901',
    emailID: 'preecha@fleet.com', standardRate: 550, overtimeRate: 825,
    fuelCard: 'FC-004',
  },
  {
    driverID: 5, branchID: 1, driverCode: 'DRV-005', driverName: 'Nattawut Pimjai',
    status: 'INACTIVE', dob: '1995-09-18', position: 'Driver',
    idNo: '5678901234567', dateHire: '2020-02-10', dateRelease: '2023-11-30',
    licenseNo: 'TH-LIC-005', licenseExpiryDate: '2026-02-10',
    phoneNumber: '085-678-9012', mobilePhoneNumber: '085-678-9012',
    standardRate: 420, overtimeRate: 630,
  },
  {
    driverID: 6, branchID: 1, driverCode: 'DRV-006', driverName: 'Chaiyaporn Supa',
    status: 'ACTIVE', dob: '1987-01-30', position: 'Driver',
    idNo: '6789012345678', dateHire: '2017-07-01',
    licenseNo: 'TH-LIC-006', licenseExpiryDate: '2027-07-01',
    phoneNumber: '086-789-0123', mobilePhoneNumber: '086-789-0123',
    standardRate: 480, overtimeRate: 720,
  },
  {
    driverID: 7, branchID: 1, driverCode: 'DRV-007', driverName: 'Teerawat Bunyuen',
    status: 'ACTIVE', dob: '1993-04-12', position: 'Driver',
    idNo: '7890123456789', dateHire: '2021-05-15',
    licenseNo: 'TH-LIC-007', licenseExpiryDate: '2026-05-15',
    phoneNumber: '087-890-1234', mobilePhoneNumber: '087-890-1234',
    standardRate: 430, overtimeRate: 645,
  },
  {
    driverID: 8, branchID: 1, driverCode: 'DRV-008', driverName: 'Montri Saeyang',
    status: 'TERMINATED', dob: '1975-12-25', position: 'Senior Driver',
    idNo: '8901234567890', dateHire: '2008-01-01', dateRelease: '2023-06-30',
    licenseNo: 'TH-LIC-008', licenseExpiryDate: '2023-01-01',
    standardRate: 550, overtimeRate: 825,
  },
  {
    driverID: 9, branchID: 1, driverCode: 'DRV-009', driverName: 'Kittipong Phromsit',
    status: 'ACTIVE', dob: '1991-08-08', position: 'Driver',
    idNo: '9012345678901', dateHire: '2019-11-01',
    licenseNo: 'TH-LIC-009', licenseExpiryDate: '2027-11-01',
    phoneNumber: '089-901-2345', mobilePhoneNumber: '089-901-2345',
    emailID: 'kittipong@fleet.com', standardRate: 460, overtimeRate: 690,
  },
  {
    driverID: 10, branchID: 1, driverCode: 'DRV-010', driverName: 'Somporn Rattanaphan',
    status: 'ACTIVE', dob: '1986-02-14', position: 'Senior Driver',
    idNo: '0123456789012', dateHire: '2014-04-01',
    licenseNo: 'TH-LIC-010', licenseExpiryDate: '2026-04-01',
    phoneNumber: '090-012-3456', mobilePhoneNumber: '090-012-3456',
    standardRate: 520, overtimeRate: 780, fuelCard: 'FC-010',
  },
  {
    driverID: 11, branchID: 1, driverCode: 'DRV-011', driverName: 'Narong Manee',
    status: 'ON LEAVE', dob: '1989-06-20', position: 'Driver',
    idNo: '1122334455667', dateHire: '2016-09-15',
    licenseNo: 'TH-LIC-011', licenseExpiryDate: '2025-09-15',
    phoneNumber: '091-123-4567', mobilePhoneNumber: '091-123-4567',
    standardRate: 470, overtimeRate: 705,
  },
  {
    driverID: 12, branchID: 1, driverCode: 'DRV-012', driverName: 'Sakda Wongsiri',
    status: 'INACTIVE', dob: '1997-10-03', position: 'Driver',
    idNo: '2233445566778', dateHire: '2022-03-01', dateRelease: '2024-01-15',
    licenseNo: 'TH-LIC-012', licenseExpiryDate: '2027-03-01',
    phoneNumber: '092-234-5678', mobilePhoneNumber: '092-234-5678',
    standardRate: 400, overtimeRate: 600,
  },
]

export const MOCK_DRIVERS = MOCK_DRIVERS_SEED
