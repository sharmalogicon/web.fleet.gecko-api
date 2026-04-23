'use client'
import { useState } from 'react'
import type { EquipmentTypeRecord, EquipmentTypeFormValues } from '@/types/equipment-type'
import { upsertMockEquipmentType, removeMockEquipmentType } from '@/lib/mock/equipment-types'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useEquipmentType(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: EquipmentTypeFormValues): Promise<EquipmentTypeRecord> {
    setIsSaving(true)
    try {
      await delay(400)
      const record: EquipmentTypeRecord = {
        ...values,
        equipmentTypeSizeID: id === 'new' ? Date.now() : parseInt(id, 10),
        equipmentTypeSize: `${values.equipmentType}-${values.equipmentSize}`,
      }
      upsertMockEquipmentType(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockEquipmentType(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
