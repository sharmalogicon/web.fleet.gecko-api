'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiFile, apiGet, apiUpload } from '@/lib/api/client';
import type { components } from '@/lib/api/fleet.schema';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Work-order photos (prompt 10 §A). */

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

const base = (woId: string) => `/api/fleet/work-orders/${woId}/attachments`;

export function useWoAttachments(woId: string | null) {
  const tenant = useAuth().user?.tenantId;
  return useQuery({ queryKey: ['fleet', 'wo-attachments', tenant, woId], queryFn: () => apiGet<WoAttachmentDto[]>(base(woId!)), enabled: !!woId });
}

export function useUploadWoAttachment(woId: string) {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: ({ file, stage, caption }: { file: File; stage: string; caption: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('stage', stage);
      if (caption.trim()) form.append('caption', caption.trim());
      return apiUpload<WoAttachmentDto>(base(woId), form);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['fleet', 'wo-attachments', tenant, woId] }),
  });
}

export function useRemoveWoAttachment(woId: string) {
  const client = useQueryClient();
  const tenant = useAuth().user?.tenantId;
  return useMutation({
    mutationFn: (attachmentId: string) => api<void>(`${base(woId)}/${attachmentId}`, { method: 'DELETE' }),
    onSettled: () => client.invalidateQueries({ queryKey: ['fleet', 'wo-attachments', tenant, woId] }),
  });
}

/**
 * Blob URLs for the attachments (an <img src> cannot carry the bearer token). Fetched through the API client,
 * revoked when the list changes or the tab unmounts.
 */
export function useAttachmentUrls(woId: string, items: WoAttachmentDto[] | undefined) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const ids = (items ?? []).map((a) => a.attachmentId).join(',');
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const a of items ?? []) {
        try {
          const { blob } = await apiFile(`${base(woId)}/${a.attachmentId}/content`);
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
  }, [woId, ids]);
  return urls;
}
