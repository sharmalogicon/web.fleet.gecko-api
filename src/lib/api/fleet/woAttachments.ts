'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiFile, apiGet, apiUpload } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Work-order photos (prompt 10 §A) and accident photos (prompt 14 §C): same endpoints, same rules. */

export type WoAttachmentDto = components['schemas']['WoAttachmentDto'];
export const PHOTO_STAGES = ['BEFORE', 'DURING', 'AFTER', 'INVOICE'] as const;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_BYTES = 10 * 1024 * 1024;

/** The browser-side check before uploading (the API answers 400 `file` too). An i18n key or null. */
export function uploadError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'wo.photo.badType';
  if (file.size > MAX_BYTES) return 'wo.photo.tooBig';
  if (file.size === 0) return 'wo.photo.empty';
  return null;
}

/** An attachment owner: `/api/fleet/<kind>/<id>/attachments` (work orders prompt 10, accidents prompt 14 §C). */
export type AttachmentOwner = { kind: 'work-orders' | 'accidents'; id: string };
export type AttachmentDto = WoAttachmentDto;
export const ACCIDENT_STAGES = ['SCENE', 'DAMAGE', 'POLICE', 'REPAIR', 'OTHER'] as const;

const ownerBase = (o: AttachmentOwner) => `/api/fleet/${o.kind}/${o.id}/attachments`;
const ownerKey = (tenant: string | undefined, o: AttachmentOwner) =>
  o.kind === 'work-orders' ? ['fleet', 'wo-attachments', tenant, o.id] : ['fleet', `${o.kind}-attachments`, tenant, o.id];

export function useAttachments(o: AttachmentOwner | null) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({
    queryKey: o ? ownerKey(tenant, o) : ['fleet', 'attachments', 'none'],
    queryFn: () => apiGet<AttachmentDto[]>(ownerBase(o!)),
    enabled: !!o?.id,
  });
}

export function useUploadAttachment(o: AttachmentOwner) {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: ({ file, stage, caption }: { file: File; stage: string; caption: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('stage', stage);
      if (caption.trim()) form.append('caption', caption.trim());
      return apiUpload<AttachmentDto>(ownerBase(o), form);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ownerKey(tenant, o) }),
  });
}

export function useRemoveAttachment(o: AttachmentOwner) {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: (attachmentId: string) => api<void>(`${ownerBase(o)}/${attachmentId}`, { method: 'DELETE' }),
    onSettled: () => client.invalidateQueries({ queryKey: ownerKey(tenant, o) }),
  });
}

// Work-order names kept for the existing callers.
export const useWoAttachments = (woId: string | null) => useAttachments(woId ? { kind: 'work-orders', id: woId } : null);
export const useUploadWoAttachment = (woId: string) => useUploadAttachment({ kind: 'work-orders', id: woId });
export const useRemoveWoAttachment = (woId: string) => useRemoveAttachment({ kind: 'work-orders', id: woId });

/**
 * Blob URLs for the attachments (an <img src> cannot carry the bearer token). Fetched through the API client,
 * revoked when the list changes or the tab unmounts. `owner` may be a WO id (older callers).
 */
export function useAttachmentUrls(owner: string | AttachmentOwner, items: AttachmentDto[] | undefined) {
  const o: AttachmentOwner = typeof owner === 'string' ? { kind: 'work-orders', id: owner } : owner;
  const base = ownerBase(o);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const ids = (items ?? []).map((a) => a.attachmentId).join(',');
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const a of items ?? []) {
        try {
          const { blob } = await apiFile(`${base}/${a.attachmentId}/content`);
          const url = URL.createObjectURL(blob);
          made.push(url);
          next[a.attachmentId] = url;
        } catch {
          // A file that cannot be read shows the placeholder tile.
        }
      }
      if (alive) setUrls(next);
    })();
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, ids]);
  return urls;
}
