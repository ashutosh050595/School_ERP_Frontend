import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        success: { 50:'#f0fdf4',500:'#22c55e',600:'#16a34a' },
        warning: { 50:'#fffbeb',500:'#f59e0b',600:'#d97706' },
        danger:  { 50:'#fef2f2',500:'#ef4444',600:'#dc2626' },
      },
      fontFamily: {
        display: ['var(--font-nunito)', 'Georgia', 'serif'],
        body:    ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'spin-slow':'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from:{opacity:'0'}, to:{opacity:'1'} },
        slideUp: { from:{opacity:'0',transform:'translateY(12px)'}, to:{opacity:'1',transform:'translateY(0)'} },
      },
    },
  },
  plugins: [],
}
export default config
