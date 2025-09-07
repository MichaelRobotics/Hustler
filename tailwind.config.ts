import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#111827',
          800: '#1f2937',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
          50: '#f9fafb',
        },
        violet: {
          600: '#7c3aed',
          700: '#6d28d9',
          500: '#8b5cf6',
        }
      },
      // Performance-optimized animations
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'pulse-optimized': 'pulse-optimized 2s ease-in-out infinite',
        'spin-optimized': 'spin-optimized 1s linear infinite',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translate3d(100%, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translate3d(-100%, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { transform: 'translate3d(0, 20px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        'pulse-optimized': {
          '0%, 100%': { opacity: '1', transform: 'scale3d(1, 1, 1)' },
          '50%': { opacity: '0.8', transform: 'scale3d(1.05, 1.05, 1)' },
        },
        'spin-optimized': {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '100%': { transform: 'translate3d(0, 0, 0) rotate(360deg)' },
        },
      },
      // Performance utilities
      transitionProperty: {
        'transform': 'transform',
        'opacity': 'opacity',
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
      },
      transitionTimingFunction: {
        'optimized': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      // GPU acceleration utilities
      transform: {
        'gpu': 'translate3d(0, 0, 0)',
      },
      willChange: {
        'transform': 'transform',
        'scroll': 'scroll-position',
        'opacity': 'opacity',
      },
      // Optimized backdrop blur
      backdropBlur: {
        'optimized': '4px',
      },
      // Performance-optimized shadows
      boxShadow: {
        'optimized': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'optimized-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config