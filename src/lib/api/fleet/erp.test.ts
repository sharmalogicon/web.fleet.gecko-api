import { describe, expect, it } from 'vitest'
import { batchHasFailures, batchResults, connectionErrors, EMPTY_CONNECTION, mappingErrors, toConnectionRequest, toMappingRequest } from './erp'

describe('ERP mapping rules (prompt 17 §A)', () => {
  it('GL keys from the fixed list; TAX / WHT keyed by the rate; erp code required', () => {
    expect(mappingErrors({ mapType: 'GL', geckoCode: 'MANUAL', erpCode: '5100-01', description: '' })).toEqual({})
    expect(mappingErrors({ mapType: 'GL', geckoCode: 'FUEL', erpCode: '5100', description: '' }).geckocode).toBe('erp.rule.glKey')
    expect(mappingErrors({ mapType: 'TAX', geckoCode: 'VAT7', erpCode: 'P07', description: '' }).geckocode).toBe('erp.rule.rateKey')
    expect(mappingErrors({ mapType: 'WHT', geckoCode: '3', erpCode: '', description: '' })).toEqual({ erpcode: 'erp.rule.erpCode' })
    expect(mappingErrors({ mapType: 'BP', geckoCode: '', erpCode: 'V001', description: '' }).geckocode).toBe('erp.rule.geckoCode')
  })
  it('request: rate without trailing zeros, BP upper-cased', () => {
    expect(toMappingRequest({ mapType: 'TAX', geckoCode: '7.00', erpCode: ' P07 ', description: '' })).toEqual({ mapType: 'TAX', geckoCode: '7', erpCode: 'P07', description: null })
    expect(toMappingRequest({ mapType: 'BP', geckoCode: 'sup1', erpCode: 'V001', description: 'x' }).geckoCode).toBe('SUP1')
  })
})

describe('ERP connection rules', () => {
  it('https or fake:// URL, company + user required, numeric series', () => {
    expect(connectionErrors({ ...EMPTY_CONNECTION, baseUrl: 'fake://demo', companyDb: 'SBODEMO', userName: 'manager' })).toEqual({})
    expect(connectionErrors({ ...EMPTY_CONNECTION, baseUrl: 'http://sap', companyDb: 'X', userName: 'u' }).baseurl).toBe('erp.rule.baseUrlFormat')
    expect(Object.keys(connectionErrors({ ...EMPTY_CONNECTION, defaultSeries: 'A' })).sort()).toEqual(['baseurl', 'companydb', 'defaultseries', 'username'])
    expect(toConnectionRequest({ ...EMPTY_CONNECTION, baseUrl: ' fake://demo ', companyDb: 'C', userName: 'u', defaultSeries: '12' }, 'rv'))
      .toMatchObject({ baseUrl: 'fake://demo', passwordRef: null, defaultSeries: 12, isActive: true, rowVersion: 'rv' })
  })
})

describe('SAP batch result (prompt 17 §B)', () => {
  it('maps each document to posted / failed', () => {
    const b = {
      target: 'SAP_B1', status: 'PARTLY_FAILED',
      documents: [
        { docType: 'INVOICE', documentId: 'v1', documentNo: 'VIN-1', supplierDocNo: 'A', supplierPartyCode: 'S1', supplierName: 'Parts', documentDate: '', currencyCode: 'THB', amount: 1070, status: 'EXPORTED', erpDocNum: '5001', erpError: null },
        { docType: 'CREDIT_NOTE', documentId: 'c1', documentNo: 'VCN-1', supplierDocNo: null, supplierPartyCode: 'S1', supplierName: null, documentDate: '', currencyCode: 'THB', amount: 100, status: 'APPROVED', erpDocNum: null, erpError: 'No G/L account for CREDIT lines' },
      ],
    }
    const r = batchResults(b as never)
    expect(r[0]).toMatchObject({ posted: true, erpDocNum: '5001', amount: 1070 })
    expect(r[1]).toMatchObject({ posted: false, erpError: 'No G/L account for CREDIT lines', supplierName: 'S1' })
    expect(batchHasFailures(b as never)).toBe(true)
    expect(batchHasFailures({ target: 'CSV', status: 'SENT', documents: [] } as never)).toBe(false)
  })
})
