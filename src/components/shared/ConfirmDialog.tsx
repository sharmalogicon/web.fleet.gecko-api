'use client'

import { useEffect, useRef } from 'react'
import { useT } from '@/i18n/I18nContext'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}


export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const { t } = useT()
  const resolvedConfirmLabel = confirmLabel ?? t('common.delete')
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
      prevFocusRef.current?.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      className="rounded-xl shadow-2xl p-0 max-w-sm w-full backdrop:bg-black/40 open:animate-none"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="p-6 flex flex-col gap-4">
        <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-message" className="text-sm text-gray-600">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
