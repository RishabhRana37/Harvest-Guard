/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-overlay': 'var(--bg-overlay)',
        'green-neon': 'var(--green-neon)',
        'green-bright': 'var(--green-bright)',
        'green-mid': 'var(--green-mid)',
        'green-deep': 'var(--green-deep)',
        'ai-blue': 'var(--ai-blue)',
        'ai-blue-500': 'var(--ai-blue)',
        'ai-purple': 'var(--ai-purple)',
        'sev-healthy': 'var(--sev-healthy)',
        'sev-mild': 'var(--sev-mild)',
        'sev-severe': 'var(--sev-severe)',
        'sev-pending': 'var(--sev-pending)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-accent': 'var(--text-accent)',
        'border': 'var(--border)',
        'border-bright': 'var(--border-bright)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '16': '16px',
        '12': '12px',
        '8': '8px',
      },
      spacing: {
        '8': '8px',
      }
    },
  },
  plugins: [],
}
