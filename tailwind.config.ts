import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand — warm ink + Shopee-orange accent
        ink: "#1a1614",
        muted: "#6b645d",
        faint: "#9a938c",
        line: "#e6e1da",
        soft: "#f5f3ef",
        brand: {
          DEFAULT: "#ee4d2d", // Shopee orange
          600: "#d63f22",
          50: "#fff1ed",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,22,20,.04), 0 8px 24px -12px rgba(26,22,20,.12)",
      },
      borderRadius: {
        xl: "0.9rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
