import { describe, expect, it } from 'vitest';
import { mapFieldErrors, mmToM, mToMm, toCreateRequest, toUpdateRequest, toViewModel, viewStatus, type AssetDto } from './assets';

const dto = (p: Partial<AssetDto> = {}): AssetDto => ({
  assetProfileId: 'a1', branchId: 'b1', assetSource: 'TRUCKING_VEHICLE', isLinked: true, vehicleId: 'v1', chassisId: null,
  assetCode: 'TR-001', assetName: 'Head 1', assetClass: 'PRIME_MOVER', assetCategoryCode: 'TRUCK', registrationNo: '70-1234',
  makeCode: 'HINO', modelName: '700', yearBuilt: 2020, vin: 'VIN123', engineNo: 'E1', sourceTypeCode: null, fuelType: 'DIESEL',
  ownershipType: 'OWN', ownerPartyCode: null, sourceStatus: 'ACTIVE', sourceSyncedAt: null, meterType: 'KM',
  axleLayoutId: 'L1', axleLayoutCode: 'TRACTOR_6X4', defaultWorkshopBranchId: 'w1', costCenterCode: 'CC1', erpAssetCode: 'ERP1',
  inServiceDate: '2020-05-01', acquisitionCost: 2500000, currencyCode: 'THB', residualValue: 100000, expectedLifeKm: 1000000,
  expectedLifeMonths: 120, warrantyUntilDate: null, warrantyUntilKm: null, status: 'ACTIVE', disposedDate: null, remarks: 'r',
  rowVersion: 'rv1',
  specification: {
    grossWeightKg: 25000, netWeightKg: 9000, lengthM: 6.85, widthM: 2.5, heightM: 3.1, engineCapacityCc: 12900,
    horsePowerHp: 480, fuelCapacityL: 400, payloadKg: 16000, licenceNo: 'LIC-9',
  },
  ...p,
});

describe('toViewModel (prompt 03 §3.2 + §4 field map)', () => {
  const v = toViewModel(dto());
  it('maps identity fields to the form names', () => {
    expect(v).toMatchObject({
      id: 'a1', code: 'TR-001', equipmentType: 'PRIME_MOVER', category: 'TRUCK', brand: 'HINO', model: '700',
      yearOfManufacture: 2020, purchaseDate: '2020-05-01', purchasePrice: 2500000, ownership: 'OWN', chassisNo: 'VIN123',
      licenseNo: 'LIC-9', isLinked: true, axleLayoutId: 'L1',
    });
  });
  it('shows the Spec tab lengths in mm (API stores metres)', () => {
    expect(v.length).toBe(6850);
    expect(v.width).toBe(2500);
    expect(v.height).toBe(3100);
    expect(v.fuelCapacity).toBe(400);
    expect(v.engineCapacity).toBe(12900);
  });
  it('accepts numbers sent as strings', () => {
    expect(toViewModel(dto({ yearBuilt: '2019', acquisitionCost: '10.5' })).yearOfManufacture).toBe(2019);
  });
  it('copes with an asset that has no specification', () => {
    expect(toViewModel(dto({ specification: null })).grossWeight).toBeUndefined();
  });
});

describe('viewStatus', () => {
  it('shows UNDER REPAIR from Trucking', () => expect(viewStatus({ status: 'ACTIVE', sourceStatus: 'UNDER_REPAIR' })).toBe('UNDER REPAIR'));
  it('passes the API statuses through', () => {
    expect(viewStatus({ status: 'DISPOSED', sourceStatus: null })).toBe('DISPOSED');
    expect(viewStatus({ status: 'INACTIVE', sourceStatus: 'REMOVED' })).toBe('INACTIVE');
  });
});

describe('mm ↔ m', () => {
  it('round-trips without float noise', () => {
    expect(mToMm(2.6)).toBe(2600);
    expect(mmToM(2600)).toBe(2.6);
    expect(mmToM(undefined)).toBeNull();
  });
});

describe('toUpdateRequest', () => {
  it('sends back the fields the form does not show, unchanged', () => {
    const d = dto();
    const r = toUpdateRequest(toViewModel(d), d);
    expect(r).toMatchObject({
      branchId: 'b1', assetName: 'Head 1', defaultWorkshopBranchId: 'w1', costCenterCode: 'CC1', erpAssetCode: 'ERP1',
      residualValue: 100000, expectedLifeKm: 1000000, expectedLifeMonths: 120, ownerPartyCode: null, rowVersion: 'rv1',
      currencyCode: 'THB', status: 'ACTIVE', disposedDate: null,
    });
  });
  it('sends the whole specification in API units', () => {
    const d = dto();
    expect(toUpdateRequest({ ...toViewModel(d), length: 7000, netWeight: undefined }, d).specification).toEqual({
      grossWeightKg: 25000, netWeightKg: null, lengthM: 7, widthM: 2.5, heightM: 3.1, engineCapacityCc: 12900,
      horsePowerHp: 480, fuelCapacityL: 400, payloadKg: 16000, licenceNo: 'LIC-9',
    });
  });
  it('keeps the stored status when the form shows UNDER REPAIR', () => {
    const d = dto({ sourceStatus: 'UNDER_REPAIR', status: 'ACTIVE' });
    expect(toUpdateRequest(toViewModel(d), d).status).toBe('ACTIVE');
  });
  it('dates a disposal today unless the record has a date', () => {
    const d = dto({ assetSource: 'FLEET', isLinked: false });
    expect(toUpdateRequest({ ...toViewModel(d), status: 'DISPOSED' }, d).disposedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toUpdateRequest({ ...toViewModel(d), status: 'DISPOSED' }, { ...d, disposedDate: '2026-01-02' }).disposedDate).toBe('2026-01-02');
  });
  it('upper-cases codes and turns empty text into null', () => {
    const d = dto();
    const r = toUpdateRequest({ ...toViewModel(d), brand: ' volvo ', category: '', remarks: '  ' }, d);
    expect(r.makeCode).toBe('VOLVO');
    expect(r.assetCategoryCode).toBeNull();
    expect(r.remarks).toBeNull();
  });
});

describe('toCreateRequest', () => {
  it('creates a FLEET asset at the given branch with THB when a price is given', () => {
    const r = toCreateRequest({ code: 'fl-01', status: 'ACTIVE', equipmentType: 'forklift', purchasePrice: 900000, meterType: 'HOUR' }, 'b9');
    expect(r).toMatchObject({ branchId: 'b9', assetCode: 'FL-01', assetClass: 'FORKLIFT', ownershipType: 'OWN', acquisitionCost: 900000, currencyCode: 'THB', meterType: 'HOUR' });
  });
  it('sends no currency without a price', () => {
    expect(toCreateRequest({ code: 'X', status: 'ACTIVE' }, 'b').currencyCode).toBeNull();
  });
});

describe('mapFieldErrors', () => {
  it('puts API field errors under the form fields', () => {
    const { fields, other } = mapFieldErrors({ 'specification.netweightkg': 'Net above gross', assetclass: 'One of …', foo: 'x' });
    expect(fields.netWeight).toBe('Net above gross');
    expect(fields.equipmentType).toBe('One of …');
    expect(other).toEqual(['x']);
  });
});
