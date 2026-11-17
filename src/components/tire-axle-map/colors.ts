import type { TireHealth } from '@/types/tire-axle-map'

export const HEALTH_COLOR: Record<TireHealth, string> = {
  good: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
}

export const HEALTH_BADGE: Record<TireHealth, string> = {
  good: 'bg-green-50 text-green-700 ring-green-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
}
