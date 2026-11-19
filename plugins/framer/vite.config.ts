import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "https" && mkcert(), mode !== "browser" && framer()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
}))
