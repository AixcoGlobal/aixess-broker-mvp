import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localAnalytics } from "./scripts/local-analytics.mjs";
import { assetVersions } from "./scripts/asset-versions.mjs";

export default defineConfig({
  build: {
    outDir: "dist/client",
    // Vite's own hashed JS/CSS go to /app/, cached for a year (vercel.json); public files
    // keep their /assets/ paths and get ?v= versions (scripts/asset-versions.mjs).
    assetsDir: "app",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./tests/setup.js"],
  },
  plugins: [assetVersions(), react(), localAnalytics()],
});
