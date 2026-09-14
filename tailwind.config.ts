import type { Config } from 'tailwindcss'

/**
 * Theme tokens are CSS variables (RGB triplets) defined in globals.css for
 * [data-theme="dark"] and [data-theme="light"], so every utility switches
 * instantly with the theme and keeps Tailwind opacity modifiers.
 */
const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-2': 'rgb(var(--bg-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        magenta: { DEFAULT: '#D92989', bright: '#F13CA6', deep: '#8F1338' },
      },
      borderColor: { DEFAULT: 'var(--border)' },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06)',
        pop: '0 12px 40px rgba(0,0,0,0.18)',
      },
      borderRadius: { xl2: '14px' },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pulse-dot': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
        'dash-flow': { to: { strokeDashoffset: '-24' } },
        spin: { to: { transform: 'rotate(360deg)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'ping-soft': { '0%': { transform: 'scale(1)', opacity: '0.6' }, '100%': { transform: 'scale(3.2)', opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 260ms ease-out both',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'dash-flow': 'dash-flow 3s linear infinite',
        'spin-slow': 'spin 1.4s linear infinite',
        marquee: 'marquee 60s linear infinite',
        'ping-soft': 'ping-soft 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      maxWidth: { wrap: '1200px' },
    },
  },
  plugins: [],
}
export default config
