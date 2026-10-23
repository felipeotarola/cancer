import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ["@xyflow/react", "@radix-ui/react-select", "eve/react"] },
  server: {
    watch: { ignored: ["**/.eve/**", "**/.output/**"] },
    proxy: {
      "/eve": "http://127.0.0.1:2002",
      "/api": "http://127.0.0.1:2002",
      "/.well-known/workflow": "http://127.0.0.1:2002",
    },
  },
});
