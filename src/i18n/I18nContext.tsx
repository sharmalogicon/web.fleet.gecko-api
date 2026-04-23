'use client'
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import en from './en.json'
import th from './th.json'

type Lang = 'en' | 'th'
type Messages = typeof en

const translations: Record<Lang, Messages> = { en, th }

const COOKIE_NAME = 'gecko_lang'

function getLangFromCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return (match?.[1] as Lang) ?? 'en'
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    setLangState(getLangFromCookie())
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    document.cookie = `${COOKIE_NAME}=${newLang};path=/;max-age=31536000;SameSite=Lax`
  }, [])

  const t = useCallback((key: string): string => {
    const parts = key.split('.')
    let val: unknown = translations[lang]
    for (const part of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[part]
      else return key
    }
    return typeof val === 'string' ? val : key
  }, [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useT() {
  return useContext(I18nContext)
}
