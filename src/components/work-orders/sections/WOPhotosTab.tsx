'use client'

import { AttachmentsTab } from '@/components/shared/AttachmentsTab'
import { PHOTO_STAGES } from '@/lib/api/fleet/woAttachments'
import { useFleetAccess } from '@/lib/api/fleet/access'

/** The WO "Photos" tab (prompt 10 §A). Uploads are allowed in every status. */
export function WOPhotosTab({ woId, branchId }: { woId: string; branchId: string }) {
  const { canAt } = useFleetAccess()
  return (
    <AttachmentsTab
      owner={{ kind: 'work-orders', id: woId }}
      stages={PHOTO_STAGES}
      defaultStage="DURING"
      stageKey="wo.photo.stage"
      canManage={canAt('fleet.workorder.manage', branchId)}
    />
  )
}
