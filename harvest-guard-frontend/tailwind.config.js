/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'green-900': 'var(--green-900)',
        'green-700': 'var(--green-700)',
        'green-500': 'var(--green-500)',
        'moss-400': 'var(--moss-400)',
        'sage-100': 'var(--sage-100)',
        'ai-blue-500': 'var(--ai-blue-500)',
        'sev-healthy': 'var(--sev-healthy)',
        'sev-mild': 'var(--sev-mild)',
        'sev-severe': 'var(--sev-severe)',
        'surface': 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        'text-strong': 'var(--text-strong)',
        'text-muted': 'var(--text-muted)',
        'border': 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '16': '16px',
        '12': '12px',
      },
      spacing: {
        '8': '8px',
      }
    },
  },
  plugins: [],
}
