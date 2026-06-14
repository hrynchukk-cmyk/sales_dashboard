import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F5F5",
        ink: "#1a1a1a",
        line: "#E8E8E8",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06)",
      },
    },
  },
  plugins: [],
};

export default config;
