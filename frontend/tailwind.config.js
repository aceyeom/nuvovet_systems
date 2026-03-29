export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        landing: {
          bg: '#050510',
          card: '#0a0a1a',
          'card-border': 'rgba(255,255,255,0.06)',
          'card-bg': 'rgba(255,255,255,0.03)',
        },
      },
    },
  },
  plugins: [],
}
