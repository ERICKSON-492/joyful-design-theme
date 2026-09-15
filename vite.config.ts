import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // In development the API is proxied through the dev server so browser
    // requests stay same-origin (no CORS, cookies just work). Point
    // API_PROXY_TARGET at http://localhost:3001 to run the API locally.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "https://joyful-design-theme.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
