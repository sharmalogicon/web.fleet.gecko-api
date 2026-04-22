import { cva } from 'class-variance-authority'
import type { DriverStatus } from '@/types/driver'

type BadgeStatus = DriverStatus | 'DEFAULT'

const badge = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        ACTIVE: 'bg-green-100 text-green-700',
        INACTIVE: 'bg-gray-100 text-gray-600',
        'ON LEAVE': 'bg-yellow-100 text-yellow-700',
        TERMINATED: 'bg-red-100 text-red-700',
        DEFAULT: 'bg-gray-100 text-gray-500',
      } as Record<BadgeStatus, string>,
    },
    defaultVariants: {
      status: 'DEFAULT' as BadgeStatus,
    },
  },
)

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const safeStatus = (['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED'] as string[]).includes(status)
    ? (status as BadgeStatus)
    : 'DEFAULT'

  return (
    <span className={badge({ status: safeStatus, className })}>
      {status || '—'}
    </span>
  )
}
