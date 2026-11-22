'use client'

import { useRef, useState } from 'react'
import { ImageGallery } from '@/components/shared/ImageGallery'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { useT } from '@/i18n/I18nContext'
import {
  PHOTO_STAGES, uploadError, useAttachmentUrls, useRemoveWoAttachment, useUploadWoAttachment, useWoAttachments, type WoAttachmentDto,
} from '@/lib/api/fleet/woAttachments'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** The WO "Photos" tab (prompt 10 §A), on the shared ImageGallery. Uploads are allowed in every status. */
export function WOPhotosTab({ woId, branchId }: { woId: string; branchId: string }) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAt } = useFleetAccess()
  const canManage = canAt('fleet.workorder.manage', branchId)
  const list = useWoAttachments(woId)
  const urls = useAttachmentUrls(woId, list.data)
  const upload = useUploadWoAttachment(woId)
  const remove = useRemoveWoAttachment(woId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<string>('DURING')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<WoAttachmentDto | null>(null)

  const pick = (f: File | null) => {
    setFile(f)
    setError(f ? (uploadError(f) ? t(uploadError(f)!) : null) : null)
  }
  const submit = () => {
    if (!file || uploadError(file)) return
    upload.mutate({ file, stage, caption }, {
      onSuccess: () => { toast.success(t('wo.photo.uploaded'), file.name); setOpen(false); setFile(null); setCaption('') },
      onError: (e) => setError(errorText(e, t)),
    })
  }

  const images = (list.data ?? []).map((a) => ({
    imageID: a.attachmentId,
    filename: a.fileName,
    url: urls[a.attachmentId] ?? '/placeholder.jpg',
    caption: a.caption ?? undefined,
    badge: t(`wo.photo.stage.${a.stage}`),
    isFile: a.contentType === 'application/pdf',
    uploadedAt: new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  }))

  return (
    <>
      {list.error && <p role="alert" className="mb-3 text-sm text-red-600">{errorText(list.error, t)}</p>}
      <ImageGallery
        images={images}
        onUpload={() => { setOpen(true); setError(null) }}
        uploadDisabled={!canManage}
        uploadDisabledReason={canManage ? undefined : t('wo.photo.noPermission')}
        uploadLabel={t('wo.photo.upload')}
        emptyMessage={list.isLoading ? '…' : t('wo.photo.none')}
        onRemove={canManage ? (img) => setRemoving(list.data?.find((a) => a.attachmentId === img.imageID) ?? null) : undefined}
        removeLabel={t('wo.photo.remove')}
      />
      {open && (
        <Panel
          open
          variant="modal"
          title={t('wo.photo.upload')}
          onClose={() => setOpen(false)}
          footer={(
            <>
              <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" busy={upload.isPending} disabled={!file || !!uploadError(file)} onClick={submit}>{t('wo.photo.upload')}</Button>
            </>
          )}
        >
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="text-sm" />
          <p className="text-xs text-gray-500">{t('wo.photo.rules')}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.photo.stageLabel')}
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={input}>
                {PHOTO_STAGES.map((s) => <option key={s} value={s}>{t(`wo.photo.stage.${s}`)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.photo.caption')}
              <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} className={input} />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </Panel>
      )}
      <ConfirmDialog
        open={!!removing}
        title={t('wo.photo.remove')}
        message={removing ? `${removing.fileName}: ${t('wo.photo.removeHint')}` : ''}
        confirmLabel={t('wo.photo.remove')}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove.mutate(removing.attachmentId, { onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)) })
          setRemoving(null)
        }}
      />
    </>
  )
}
