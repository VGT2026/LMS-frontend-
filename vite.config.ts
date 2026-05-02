import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// Dev-only: set VITE_DEV_PROXY_TARGET (e.g. backend origin) when using relative /api instead of VITE_API_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET?.trim();

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
      ...(devProxyTarget && {
        proxy: {
          "/api": {
            target: devProxyTarget,
            changeOrigin: true,
          },
        },
      }),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
