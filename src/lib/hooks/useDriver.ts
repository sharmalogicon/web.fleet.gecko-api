'use client'

import { useState } from 'react'
import type { Driver, DriverFormValues } from '@/types/driver'
import { upsertMockDriver, removeMockDriver } from '@/lib/mock/drivers'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useDriver(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: DriverFormValues): Promise<Driver> {
    setIsSaving(true)
    try {
      await delay(400)
      const driver: Driver = {
        ...values,
        driverID: id === 'new' ? Date.now() : parseInt(id, 10),
        branchID: 1,
      }
      upsertMockDriver(driver)
      return driver
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockDriver(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
