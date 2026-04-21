/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        secondary: '#7e3af2',
        success: '#0e9f6e',
        warning: '#f05252',
        ice: '#e1f5fe',
        land: '#f3e5f5',
      },
    },
  },
  plugins: [],
}
