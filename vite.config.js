import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The /api/* serverless functions are served by `vercel dev`, not Vite
    // itself — this proxy lets `npm run dev` (plain Vite) still work for
    // pure frontend iteration by forwarding to a `vercel dev` instance
    // running on 3001 (see package.json's "dev:api" script). Prefer
    // `npm run dev:full` for anything that touches /api.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
