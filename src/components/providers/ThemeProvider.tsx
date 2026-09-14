'use client'
import * as React from 'react'

export type Theme = 'dark' | 'light'
const STORAGE_KEY = 'lazarus-theme'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const Ctx = React.createContext<ThemeCtx>({ theme: 'dark', setTheme: () => undefined, toggle: () => undefined })

/**
 * Inline script for <head>: applies the persisted (or system) theme before
 * first paint so there is no flash. Dark is the default when nothing is stored
 * and the system has no light preference.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`

function readInitial(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('dark')

  React.useEffect(() => {
    setThemeState(readInitial())
    // Follow system changes only while the user has not chosen explicitly.
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(STORAGE_KEY)
      } catch {}
      if (stored === 'light' || stored === 'dark') return
      const t: Theme = mq.matches ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', t)
      setThemeState(t)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = React.useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {}
    setThemeState(t)
  }, [])

  const value = React.useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme, setTheme])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useTheme = () => React.useContext(Ctx)
