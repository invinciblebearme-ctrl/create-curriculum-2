/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edu: {
          primary: '#687fe0',
          'primary-hover': '#566ecf',
          'primary-light': '#e2eaff',
          'primary-soft': '#edf1ff',
          text: '#30415e',
          'text-dark': '#34476a',
          'text-header': '#374f7e',
          sub: '#697997',
          muted: '#8a96aa',
          border: '#e8edf6',
          'border-light': '#e0e8fa',
          bg: '#f8faff',
          subtitle: '#6b7fd0',
          success: '#4aab82',
          planned: '#a0a9ba',
        },
      },
      boxShadow: {
        'edu-card': '0 5px 22px rgba(164, 176, 202, 0.1)',
        'edu-card-hover': '0 12px 30px rgba(154, 170, 202, 0.19)',
        'edu-btn': '0 7px 16px rgba(108, 128, 218, 0.27)',
        'edu-hero': '0 16px 45px rgba(114, 133, 189, 0.08)',
        'edu-strip': '0 5px 20px rgba(164, 179, 208, 0.08)',
        'book': '0 12px 28px -4px rgba(104, 127, 224, 0.22), 0 4px 10px rgba(0, 0, 0, 0.06)',
        'book-deep': '0 25px 50px -12px rgba(52, 71, 106, 0.45)',
      },
      fontFamily: {
        sans: ['Nunito', '"Noto Sans KR"', 'sans-serif'],
        display: ['Nunito', '"Noto Sans KR"', 'sans-serif'],
      },
      borderRadius: {
        'edu-card': '23px',
        'edu-hero': '31px',
        'edu-pill': '99px',
      }
    },
  },
  plugins: [],
}
