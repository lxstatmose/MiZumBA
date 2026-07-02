import { create } from 'zustand'
import type { Lang } from '../i18n'
import { getT } from '../i18n'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  lang: Lang
  t: ReturnType<typeof getT>
  toggleTheme: () => void
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved)
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

const savedTheme = (localStorage.getItem('theme') as Theme | null) ?? 'light'
const savedLang  = (localStorage.getItem('lang')  as Lang  | null) ?? 'en'

const initialResolved = resolveTheme(savedTheme)
applyTheme(initialResolved)

export const useSettingsStore = create<SettingsStore>((set) => {
  // Listen for system theme changes
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    const cur = useSettingsStore.getState()
    if (cur.theme === 'system') {
      const resolved = getSystemTheme()
      applyTheme(resolved)
      set({ resolvedTheme: resolved })
    }
  })

  return {
    theme: savedTheme,
    resolvedTheme: initialResolved,
    lang: savedLang,
    t: getT(savedLang),

    toggleTheme: () =>
      set((s) => {
        const next: Theme = s.resolvedTheme === 'light' ? 'dark' : 'light'
        localStorage.setItem('theme', next)
        applyTheme(next)
        return { theme: next, resolvedTheme: next }
      }),

    setTheme: (theme) => {
      localStorage.setItem('theme', theme)
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      set({ theme, resolvedTheme: resolved })
    },

    setLang: (lang) => {
      localStorage.setItem('lang', lang)
      set({ lang, t: getT(lang) })
    },
  }
})
