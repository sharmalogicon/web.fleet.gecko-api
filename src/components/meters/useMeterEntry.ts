'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/i18n/I18nContext'
import { allowedMeterTypes, localDateTime, METER_API_TO_FORM, recordError, useRecordMeter, type ScreenMeterType } from '@/lib/api/fleet/meters'
import type { AssetView } from '@/lib/api/fleet/assets'
import type { DriverView } from '@/lib/api/fleet/drivers'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { mapApiFields } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'

/** State + save of a NEW meter reading (both meter screens). A saved reading is never edited. */
export function useMeterEntry(defaultType: ScreenMeterType, listPath: string) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const record = useRecordMeter()
  const [equipmentCode, setEquipmentCode] = useState('')
  const [asset, setAsset] = useState<AssetView | null>(null)
  const [readingAt, setReadingAt] = useState(localDateTime())
  const [meterType, setMeterType] = useState<ScreenMeterType>(defaultType)
  const [km, setKm] = useState('')
  const [hours, setHours] = useState('')
  const [driverText, setDriverText] = useState('')
  const [driver, setDriver] = useState<DriverView | null>(null)
  const [remarks, setRemarks] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)

  const allowed = asset ? allowedMeterTypes(asset.dto.meterType) : (['KM', 'HOUR', 'BOTH'] as ScreenMeterType[])
  // Keep the type valid for the picked asset.
  const effectiveType: ScreenMeterType = allowed.includes(meterType) ? meterType : allowed[0] ?? meterType
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s))

  const input = {
    assetProfileId: asset?.id ?? '',
    assetMeterType: asset?.dto.meterType,
    readingAt,
    meterType: effectiveType,
    km: num(km),
    hours: num(hours),
    driverId: driver?.id ?? null,
    remarks,
  }
  const rule = recordError(input)
  const driverUnknown = driverText.trim() !== '' && !driver

  const submit = () => {
    setBanner(null)
    setFieldErrors({})
    if (rule || driverUnknown) {
      setBanner(t(driverUnknown ? 'meter.rule.driver' : rule!))
      return
    }
    record.mutate(input, {
      onSuccess: (rows) => {
        const suspect = rows.filter((r) => r.status === 'SUSPECT')
        if (suspect.length) toast.warning(t('meter.savedSuspect'), suspect.map((r) => r.suspectReason).filter(Boolean).join(' '))
        else toast.success(t('meter.saved'), `${asset?.code} · ${rows.map((r) => `${Number(r.readingValue).toLocaleString()} ${r.meterKind === 'KM' ? 'km' : 'hrs'}`).join(' / ')}`)
        router.push(listPath)
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 400) {
          const { fields, other } = mapApiFields(err.fieldMap, METER_API_TO_FORM)
          setFieldErrors(fields as Record<string, string>)
          setBanner(other.length ? other.join(' ') : Object.keys(fields).length ? null : errorText(err, t))
        } else setBanner(errorText(err, t))
        toast.error(t('common.saveFailed'), errorText(err, t))
      },
    })
  }

  return {
    equipmentCode, setEquipmentCode, asset, setAsset, readingAt, setReadingAt, meterType: effectiveType, setMeterType, allowed,
    km, setKm, hours, setHours, driverText, setDriverText, setDriver, remarks, setRemarks, fieldErrors, banner,
    submit, saving: record.isPending, dirty: equipmentCode !== '' || km !== '' || hours !== '',
  }
}
