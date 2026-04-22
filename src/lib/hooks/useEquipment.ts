'use client'

import { useState } from 'react'
import type { Equipment, EquipmentFormValues } from '@/types/equipment'
import { upsertMockEquipment, removeMockEquipment } from '@/lib/mock/equipment'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useEquipment(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: EquipmentFormValues): Promise<Equipment> {
    setIsSaving(true)
    try {
      await delay(400)
      const eq: Equipment = {
        ...values,
        equipmentID: id === 'new' ? Date.now() : parseInt(id, 10),
        branchID: 1,
      }
      upsertMockEquipment(eq)
      return eq
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockEquipment(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
