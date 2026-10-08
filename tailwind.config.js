/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", hover: "#4338CA", light: "#EEF2FF" },
        secondary: { DEFAULT: "#0D9488", light: "#CCFBF1" },
        accent: { DEFAULT: "#F59E0B" },
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#1E293B",
        "text-secondary": "#64748B",
        border: "#E2E8F0",
        sidebar: "#111827",
        "sidebar-text": "#9CA3AF",
      },
      fontFamily: {
        heading: ["Kanit", "Sarabun", "sans-serif"],
        body: ["Sarabun", "Kanit", "sans-serif"],
      },
    },
  },
  plugins: [],
};