import { describe, expect, it } from 'vitest';
import { settingValueError } from './SettingsTab';
import { approvalErrors, permissionKey } from './ApprovalsTab';
import { laborRateErrors, latestOf, nextDay } from './LaborRatesTab';
import type { LaborCostRate, SettingCatalogueItem } from '@/lib/api/fleet/setup';

const def = (p: Partial<SettingCatalogueItem>): SettingCatalogueItem => ({
  settingCode: 'X', valueType: 'DECIMAL', defaultValue: '0', description: '', min: null, max: null, allowedValues: null, ...p,
});

describe('settingValueError (mirrors FleetSetupCatalogue.Normalise)', () => {
  it('needs a value', () => expect(settingValueError(def({}), ' ')?.key).toBe('fleetSetup.rule.valueRequired'));
  it('checks INT and DECIMAL', () => {
    expect(settingValueError(def({ valueType: 'INT' }), '1.5')?.key).toBe('fleetSetup.rule.int');
    expect(settingValueError(def({ valueType: 'DECIMAL' }), 'abc')?.key).toBe('fleetSetup.rule.decimal');
    expect(settingValueError(def({ valueType: 'DECIMAL' }), '2.5')).toBeNull();
  });
  it('checks the range', () => {
    expect(settingValueError(def({ min: 1, max: 60 }), '61')?.key).toBe('fleetSetup.rule.range');
    expect(settingValueError(def({ min: '1', max: '60' }), '60')).toBeNull();
  });
  it('checks CODE against the allowed values', () => {
    expect(settingValueError(def({ valueType: 'CODE', allowedValues: ['THB', 'USD'] }), 'EUR')?.key).toBe('fleetSetup.rule.allowed');
    expect(settingValueError(def({ valueType: 'CODE', allowedValues: ['THB'] }), 'thb')).toBeNull();
  });
});

describe('approvalErrors (mirrors ApprovalPolicyEndpoints.Check)', () => {
  const ok = { approvalLevel: 1, minAmount: '', currencyCode: '' };
  it('accepts an always-applies step', () => expect(approvalErrors(ok)).toEqual({}));
  it('needs amount and currency together', () => {
    expect(approvalErrors({ ...ok, minAmount: '1000' }).currencyCode).toBe('fleetSetup.rule.amountCurrency');
    expect(approvalErrors({ ...ok, currencyCode: 'THB' }).currencyCode).toBe('fleetSetup.rule.amountCurrency');
    expect(approvalErrors({ ...ok, minAmount: '1000', currencyCode: 'THB' })).toEqual({});
  });
  it('checks level and currency format', () => {
    expect(approvalErrors({ ...ok, approvalLevel: 10 }).approvalLevel).toBe('fleetSetup.rule.level');
    expect(approvalErrors({ ...ok, minAmount: '5', currencyCode: 'TH1' }).currencyCode).toBe('fleetSetup.rule.currency');
  });
  it('turns permission dots into an i18n path', () => expect(permissionKey('fleet.purchase.approve')).toBe('fleetPerm.fleet_purchase_approve'));
});

describe('labour rate rules (mirror LaborCostRateEndpoints)', () => {
  const rate = (from: string, to: string | null, branchId: string | null = null): LaborCostRate => ({
    laborCostRateId: from, branchId, tradeCode: 'MECHANIC', costPerHour: 300, otCostPerHour: 450, currencyCode: 'THB',
    effectiveFrom: from, effectiveTo: to, remarks: null, rowVersion: 'v',
  });

  it('refuses overtime below the normal rate', () => {
    expect(laborRateErrors({ costPerHour: '300', otCostPerHour: '200' }, {}).otCostPerHour).toBe('fleetSetup.rule.otBelow');
    expect(laborRateErrors({ costPerHour: '300', otCostPerHour: '' }, {})).toEqual({});
  });
  it('starts a new rate after the latest one', () => {
    const f = { costPerHour: '300', otCostPerHour: '', currencyCode: 'THB' };
    expect(laborRateErrors({ ...f, effectiveFrom: '2026-01-01' }, { latestFrom: '2026-01-01' }).effectiveFrom).toBe('fleetSetup.rule.afterLatest');
    expect(laborRateErrors({ ...f, effectiveFrom: '2026-01-02' }, { latestFrom: '2026-01-01' })).toEqual({});
  });
  it('ends an edited rate before the next one', () => {
    const f = { costPerHour: '300', otCostPerHour: '' };
    expect(laborRateErrors({ ...f, effectiveTo: '' }, { ownFrom: '2026-01-01', nextFrom: '2026-06-01' }).effectiveTo).toBe('fleetSetup.rule.endBeforeNext');
    expect(laborRateErrors({ ...f, effectiveTo: '2026-06-01' }, { ownFrom: '2026-01-01', nextFrom: '2026-06-01' }).effectiveTo).toBe('fleetSetup.rule.endBeforeNext');
    expect(laborRateErrors({ ...f, effectiveTo: '2026-05-31' }, { ownFrom: '2026-01-01', nextFrom: '2026-06-01' })).toEqual({});
    expect(laborRateErrors({ ...f, effectiveTo: '2025-12-31' }, { ownFrom: '2026-01-01' }).effectiveTo).toBe('fleetSetup.rule.endBeforeStart');
  });
  it('finds the latest rate per scope', () => {
    const rows = [rate('2026-01-01', '2026-05-31'), rate('2026-06-01', null), rate('2026-09-01', null, 'b1')];
    expect(latestOf(rows, 'MECHANIC', null)?.effectiveFrom).toBe('2026-06-01');
    expect(latestOf(rows, 'MECHANIC', 'b1')?.effectiveFrom).toBe('2026-09-01');
  });
  it('adds a day across month ends', () => expect(nextDay('2026-02-28')).toBe('2026-03-01'));
});
