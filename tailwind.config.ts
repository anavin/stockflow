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
        // cool neutral slate + refined Shopee-orange accent = clean/professional
        ink: "#1b2230",     // cool charcoal (headings/values)
        muted: "#5a6576",   // slate gray (secondary text)
        faint: "#94a0b1",   // light slate (tertiary)
        line: "#e6e9f0",    // cool hairline border
        soft: "#f1f4f9",    // cool soft bg / hover
        brand: {
          DEFAULT: "#059669", // professional emerald
          600: "#047857",
          50: "#ecfdf5",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 6px 20px -8px rgba(15,23,42,.10)",
      },
      borderRadius: {
        xl: "0.9rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
