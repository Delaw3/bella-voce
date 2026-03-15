import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "bv-primary": "#2CA6A4",
        "bv-secondary": "#9FD6D5",
        "bv-text": "#1F2937",
        "bv-bg": "#F8FAFA",
        "bv-accent": "#1E8C8A",
      },
    },
  },
};

export default config;
