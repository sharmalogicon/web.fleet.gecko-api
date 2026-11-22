'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { useT } from '@/i18n/I18nContext'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { SKILL_LEVELS, type TechnicianFormValues } from '@/types/technician'
import { inputClass } from './fields'

/** Skills as an inline table; saved with the record (the API replaces the list as a whole). */
export function SkillsSection({ form }: { form: UseFormReturn<TechnicianFormValues> }) {
  const { t, lang } = useT()
  const { register, control, formState: { errors } } = form
  const trades = useCodeList(FLEET_TRADE)
  const { fields, append, remove } = useFieldArray({ control, name: 'skills' })

  const rowError = (i: number) => {
    const e = errors.skills?.[i]
    const message = e?.tradeCode?.message ?? e?.skillLevel?.message ?? e?.certifiedUntil?.message
    return message ? t(message) : undefined
  }
  // A list-level message (the API's `skills`) arrives on the array itself.
  const listError = errors.skills?.message ?? errors.skills?.root?.message

  return (
    <LineItemsEditor
      items={fields}
      getKey={(f) => f.id}
      columns={[
        {
          id: 'trade',
          header: t('technician.trade'),
          cell: (_f, i) => (
            <select {...register(`skills.${i}.tradeCode`)} aria-label={`${t('technician.trade')} ${i + 1}`} className={inputClass(!!errors.skills?.[i]?.tradeCode)}>
              <option value="">— Select —</option>
              {trades.data?.map((x) => (
                <option key={x.code} value={x.code}>{lang === 'th' && x.descriptionLocal ? x.descriptionLocal : x.descriptionEn}</option>
              ))}
            </select>
          ),
        },
        {
          id: 'level',
          header: t('technician.skillLevel'),
          className: 'w-44',
          cell: (_f, i) => (
            <select {...register(`skills.${i}.skillLevel`)} aria-label={`${t('technician.skillLevel')} ${i + 1}`} className={inputClass()}>
              {SKILL_LEVELS.map((l) => <option key={l} value={l}>{t(`technician.level.${l}`)}</option>)}
            </select>
          ),
        },
        {
          id: 'certified',
          header: t('technician.certifiedUntil'),
          className: 'w-48',
          cell: (_f, i) => (
            <input type="date" {...register(`skills.${i}.certifiedUntil`)} aria-label={`${t('technician.certifiedUntil')} ${i + 1}`} className={inputClass()} />
          ),
        },
      ]}
      onAdd={() => append({ tradeCode: '', skillLevel: 'SKILLED', certifiedUntil: '' })}
      onRemove={remove}
      addLabel={t('technician.addSkill')}
      removeLabel={t('technician.removeSkill')}
      emptyText={t('technician.noSkills')}
      rowError={rowError}
      error={listError ? t(listError) : undefined}
    />
  )
}
