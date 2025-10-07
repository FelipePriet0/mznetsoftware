import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const usePolling = process.env.USE_POLLING === '1';

  return {
    server: {
      host: true,
      port: 8080,
      watch: {
        usePolling,
        // Use a gentler interval when polling is explicitly enabled
        interval: usePolling ? 1200 : undefined,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.cache/**',
          '**/public/**',
          '**/supabase/**',
          '**/*.lock',
          '**/*.log',
        ],
      },
      hmr: {
        clientPort: 8080,
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
