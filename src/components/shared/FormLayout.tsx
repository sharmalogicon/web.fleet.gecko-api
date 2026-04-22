'use client'

import type { ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface FormLayoutProps {
  title: string
  subtitle?: string
  tabs: Tab[]
  actions?: ReactNode
  isNew?: boolean
}

export function FormLayout({ title, subtitle, tabs, actions, isNew }: FormLayoutProps) {
  return (
    <div className="flex flex-col gap-0 min-h-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Tab content — rendered as sections, all visible (no JS tab switching needed at this layer) */}
      <div className="flex flex-col gap-6">
        {tabs.map((tab) => (
          <section
            key={tab.id}
            aria-labelledby={`tab-${tab.id}-heading`}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2
                id={`tab-${tab.id}-heading`}
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
              >
                {tab.label}
              </h2>
            </div>
            <div className="p-6">{tab.content}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
