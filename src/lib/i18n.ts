// Two languages, Georgian first. The current language lives here; App re-renders
// everything when it changes, so plain function calls are enough.
export type Lang = 'ka' | 'en'
export type Txt = { ka: string; en: string }

let current: Lang = 'ka'

export function setLang(lang: Lang) {
  current = lang
  document.documentElement.lang = lang
  document.title = lang === 'ka' ? 'ჭადრაკი · LevelUp Georgia' : 'Chess · LevelUp Georgia'
}

export const lang = () => current

/** Picks the current language's text. */
export const tr = (t: Txt): string => t[current]

/** Shorthand for an inline pair: t('ქართულად', 'in English'). */
export const t = (ka: string, en: string): string => (current === 'ka' ? ka : en)
