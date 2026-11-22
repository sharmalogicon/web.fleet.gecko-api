'use client'

import type { UseFormReturn } from 'react-hook-form'
import { useT } from '@/i18n/I18nContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { usePlatformUsers, type TechnicianView } from '@/lib/api/fleet/technicians'
import { useBranchContext } from '@/lib/api/platform/branches'
import { EMPLOYMENT_TYPES, TECHNICIAN_STATUSES, type TechnicianFormValues } from '@/types/technician'
import { Field, inputClass } from './fields'

interface Props {
  form: UseFormReturn<TechnicianFormValues>
  current?: TechnicianView
}

export function GeneralSection({ form, current }: Props) {
  const { t, lang } = useT()
  const { can } = useAuth()
  const { register, watch, formState: { errors } } = form
  const trades = useCodeList(FLEET_TRADE)
  const { branches } = useBranchContext()
  // GET /api/users needs user.manage: others see the linked login read-only.
  const canPickUser = can('user.manage')
  const users = usePlatformUsers(canPickUser)

  const contractor = watch('employmentType') === 'CONTRACTOR'
  const userId = watch('userId')
  const tradeLabel = (code: string, en: string, local?: string | null) => (lang === 'th' && local ? local : en) || code

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('technician.code')} *`} error={errors.technicianCode?.message}>
        <input {...register('technicianCode')} className={`${inputClass(!!errors.technicianCode)} uppercase`} placeholder="TEC-001" />
      </Field>

      <Field label={`${t('technician.fullName')} *`} error={errors.fullName?.message}>
        <input {...register('fullName')} className={inputClass(!!errors.fullName)} placeholder="Full name" />
      </Field>

      <Field label={t('technician.nickname')} error={errors.nickname?.message}>
        <input {...register('nickname')} className={inputClass(!!errors.nickname)} />
      </Field>

      <Field label={`${t('technician.branch')} *`} error={errors.branchId?.message}>
        <select {...register('branchId')} className={inputClass(!!errors.branchId)}>
          <option value="">— Select —</option>
          {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
        </select>
      </Field>

      <Field label={`${t('form.status')} *`} error={errors.status?.message} hint={t('technician.statusHint')}>
        <select {...register('status')} className={inputClass(!!errors.status)}>
          {TECHNICIAN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <Field label={`${t('technician.mainTrade')} *`} error={errors.primaryTradeCode?.message}>
        <select {...register('primaryTradeCode')} className={inputClass(!!errors.primaryTradeCode)}>
          <option value="">— Select —</option>
          {trades.data?.filter((x) => x.isActive || x.code === watch('primaryTradeCode')).map((x) => (
            <option key={x.code} value={x.code}>{tradeLabel(x.code, x.descriptionEn, x.descriptionLocal)}</option>
          ))}
        </select>
      </Field>

      <Field label={`${t('technician.employment')} *`} error={errors.employmentType?.message}>
        <select {...register('employmentType')} className={inputClass(!!errors.employmentType)}>
          {EMPLOYMENT_TYPES.map((e) => <option key={e} value={e}>{t(`technician.employmentType.${e}`)}</option>)}
        </select>
      </Field>

      <Field label={`${t('technician.vendorCompany')}${contractor ? ' *' : ''}`} error={errors.vendorPartyCode?.message} hint={t('technician.vendorHint')}>
        <input
          {...register('vendorPartyCode')}
          disabled={!contractor}
          className={`${inputClass(!!errors.vendorPartyCode, !contractor)} uppercase`}
          placeholder={contractor ? 'SUP-0001' : ''}
        />
      </Field>

      <Field label={t('technician.login')} error={errors.userId?.message} hint={canPickUser ? t('technician.loginHint') : t('technician.loginReadOnly')}>
        {canPickUser ? (
          <select {...register('userId')} className={inputClass(!!errors.userId)}>
            <option value="">{t('technician.noLogin')}</option>
            {userId && !users.data?.some((u) => u.userId === userId) && <option value={userId}>{current?.userName ?? userId.slice(0, 8)}</option>}
            {users.data?.map((u) => (
              <option key={u.userId} value={u.userId}>{u.fullName || u.userName} · {u.email}</option>
            ))}
          </select>
        ) : (
          <input value={current?.userName ?? (userId ? userId.slice(0, 8) : '—')} readOnly className={inputClass(false, true)} />
        )}
      </Field>

      <Field label={t('technician.hiredOn')} error={errors.hiredOn?.message}>
        <input type="date" {...register('hiredOn')} className={inputClass(!!errors.hiredOn)} />
      </Field>

      <Field label={t('technician.leftOn')} error={errors.leftOn?.message}>
        <input type="date" {...register('leftOn')} className={inputClass(!!errors.leftOn)} />
      </Field>

      <Field label={t('common.remarks')} error={errors.remarks?.message}>
        <textarea {...register('remarks')} rows={3} className={`${inputClass(!!errors.remarks)} resize-none`} />
      </Field>
    </div>
  )
}
