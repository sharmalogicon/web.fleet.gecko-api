import { cookies } from 'next/headers'
import en from './en.json'
import th from './th.json'

type Lang = 'en' | 'th'
const translations: Record<Lang, typeof en> = { en, th }

export async function getT() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('gecko_lang')?.value as Lang) ?? 'en'

  function t(key: string): string {
    const parts = key.split('.')
    let val: unknown = translations[lang]
    for (const part of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[part]
      else return key
    }
    return typeof val === 'string' ? val : key
  }

  return { t, lang }
}
