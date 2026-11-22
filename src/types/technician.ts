import { z } from 'zod'
import { optNum } from '@/lib/utils/zod'

export const EMPLOYMENT_TYPES = ['EMPLOYEE', 'CONTRACTOR'] as const
export const TECHNICIAN_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export const SKILL_LEVELS = ['TRAINEE', 'SKILLED', 'SENIOR', 'MASTER'] as const

export const technicianSkillSchema = z.object({
  tradeCode: z.string().min(1, 'Choose a trade'),
  skillLevel: z.enum(SKILL_LEVELS),
  certifiedUntil: z.string().optional(),
})

/**
 * Form rules mirror Gecko.Fleet TechnicianEndpoints (the API checks them again).
 * Messages are i18n keys under `technician.rule.*`.
 */
export const technicianSchema = z
  .object({
    branchId: z.string().min(1, 'technician.rule.branch'),
    technicianCode: z
      .string()
      .trim()
      .min(1, 'technician.rule.codeRequired')
      .max(30)
      .regex(/^[A-Za-z0-9\-_/.]+$/, 'technician.rule.code'),
    fullName: z.string().trim().min(1, 'technician.rule.nameRequired').max(200),
    nickname: z.string().max(100).optional(),
    userId: z.string().optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    vendorPartyCode: z.string().optional(),
    primaryTradeCode: z.string().min(1, 'technician.rule.tradeRequired'),
    costPerHour: optNum,
    otCostPerHour: optNum,
    currencyCode: z.string().optional(),
    hiredOn: z.string().optional(),
    leftOn: z.string().optional(),
    status: z.enum(TECHNICIAN_STATUSES),
    remarks: z.string().max(1000).optional(),
    skills: z.array(technicianSkillSchema),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    const vendor = v.vendorPartyCode?.trim()
    if (v.employmentType === 'CONTRACTOR' && !vendor) issue('vendorPartyCode', 'technician.rule.vendorRequired')
    // An employee's company is never sent (toRequest drops it), so no rule for it here.

    const currency = v.currencyCode?.trim()
    if (v.costPerHour === undefined && v.otCostPerHour !== undefined) issue('costPerHour', 'technician.rule.otNeedsNormal')
    else if (v.costPerHour !== undefined && !currency) issue('currencyCode', 'technician.rule.currencyRequired')
    else if (currency && !/^[A-Za-z]{3}$/.test(currency)) issue('currencyCode', 'technician.rule.currency')
    if (v.costPerHour !== undefined && v.otCostPerHour !== undefined && v.otCostPerHour < v.costPerHour)
      issue('otCostPerHour', 'technician.rule.otBelow')
    if (v.costPerHour !== undefined && v.costPerHour < 0) issue('costPerHour', 'technician.rule.negative')

    if (v.hiredOn && v.leftOn && v.leftOn < v.hiredOn) issue('leftOn', 'technician.rule.leftBeforeHired')

    const seen = new Set<string>()
    v.skills.forEach((s, i) => {
      if (s.tradeCode && seen.has(s.tradeCode))
        ctx.addIssue({ code: 'custom', path: ['skills', i, 'tradeCode'], message: 'technician.rule.skillTwice' })
      seen.add(s.tradeCode)
    })
  })

export type TechnicianFormValues = z.infer<typeof technicianSchema>
export type TechnicianSkill = z.infer<typeof technicianSkillSchema>

export const NEW_TECHNICIAN_DEFAULTS: TechnicianFormValues = {
  branchId: '',
  technicianCode: '',
  fullName: '',
  employmentType: 'EMPLOYEE',
  primaryTradeCode: '',
  status: 'ACTIVE',
  skills: [],
}
