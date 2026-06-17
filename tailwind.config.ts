import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rootly Obsidian Forest Design System (from Stitch)
        background: '#121412',
        surface: '#121412',
        'surface-dim': '#121412',
        'surface-bright': '#383a37',
        'surface-container': '#1e201e',
        'surface-container-high': '#292a28',
        'surface-container-highest': '#333533',
        'surface-container-low': '#1a1c1a',
        'surface-container-lowest': '#0d0f0d',
        'on-surface': '#e3e3df',
        'on-surface-variant': '#c0c9b9',
        'inverse-surface': '#e3e3df',
        'inverse-on-surface': '#2f312e',
        'surface-variant': '#333533',
        'surface-tint': '#91d883',

        // Primary — Electric Mint / Forest Green
        primary: '#91d883',
        'on-primary': '#003a03',
        'primary-container': '#0d530e',
        'on-primary-container': '#81c674',
        'primary-fixed': '#acf59d',
        'primary-fixed-dim': '#91d883',
        'on-primary-fixed': '#002201',
        'on-primary-fixed-variant': '#0c530e',
        'inverse-primary': '#2a6c25',

        // Secondary
        secondary: '#94d786',
        'on-secondary': '#003a02',
        'secondary-container': '#165513',
        'on-secondary-container': '#87c979',
        'secondary-fixed': '#b0f49f',
        'secondary-fixed-dim': '#94d786',
        'on-secondary-fixed': '#002201',
        'on-secondary-fixed-variant': '#135211',

        // Tertiary
        tertiary: '#ccc7ac',
        'on-tertiary': '#33311e',
        'tertiary-container': '#4a4833',
        'on-tertiary-container': '#bbb79c',
        'tertiary-fixed': '#e8e3c7',
        'tertiary-fixed-dim': '#ccc7ac',
        'on-tertiary-fixed': '#1e1c0b',
        'on-tertiary-fixed-variant': '#4a4733',

        // Error
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        // Outlines
        outline: '#8a9385',
        'outline-variant': '#41493d',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', 'system-ui', 'sans-serif'],
        geist: ['var(--font-geist)', 'Geist', 'sans-serif'],
        hanken: ['var(--font-hanken)', 'Hanken Grotesk', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['72px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-lg-mobile': ['36px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'headline-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg-mobile': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline-md': ['32px', { lineHeight: '1.2', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
        'mono-sm': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '1rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        '2xl': '64px',
        'margin-mobile': '20px',
        'margin-desktop': '64px',
        gutter: '24px',
        unit: '4px',
      },
      backgroundImage: {
        'kinetic-gradient': 'linear-gradient(135deg, #0d530e 0%, #91d883 100%)',
        'kinetic-bar': 'linear-gradient(90deg, #0d530e 0%, #91d883 100%)',
        'radial-dot-grid': 'radial-gradient(rgba(145, 216, 131, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '32px 32px',
      },
      boxShadow: {
        'primary-glow': '0 0 20px rgba(145, 216, 131, 0.3)',
        'primary-glow-lg': '0 0 40px rgba(145, 216, 131, 0.2)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inset': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        scanline: 'scanline 4s linear infinite',
        'kinetic-shimmer': 'shimmer 2s infinite',
        'score-pulse': 'scorePulse 3s ease-in-out infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '100%': { left: '100%' },
        },
        scorePulse: {
          '0%, 100%': { textShadow: '0 0 20px rgba(145, 216, 131, 0.3)' },
          '50%': { textShadow: '0 0 40px rgba(145, 216, 131, 0.5)' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.5)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
