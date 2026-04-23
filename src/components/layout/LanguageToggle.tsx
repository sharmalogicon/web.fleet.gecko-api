'use client'
import { useT } from '@/i18n/I18nContext'

export function LanguageToggle() {
  const { lang, setLang } = useT()
  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('th')}
        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'th'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        TH
      </button>
    </div>
  )
}
