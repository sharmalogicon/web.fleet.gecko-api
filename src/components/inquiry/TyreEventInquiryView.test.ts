import { describe, expect, it } from 'vitest'
import { withDocuments } from './TyreEventInquiryView'

describe('tyre inquiry rows', () => {
  it('keeps the event\'s own documentNo / assetCode and joins the document otherwise', () => {
    const rows = withDocuments(
      [{ tyreDocumentId: 'd1', documentNo: 'TCH-9', assetCode: 'TRK-9' }, { tyreDocumentId: 'd2' }] as never,
      [{ tyreDocumentId: 'd2', documentNo: 'TMN-1', assetCode: 'TRK-1' }] as never,
    )
    expect([rows[0].documentNo ?? rows[0].doc?.documentNo, rows[0].assetCode]).toEqual(['TCH-9', 'TRK-9'])
    expect(rows[1].doc?.documentNo).toBe('TMN-1')
  })
})
