import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

// Plugin: assemble posts/ and guides/ folders into public JSON before build & dev
function buildPostsPlugin() {
  const script = resolve(__dirname, "scripts/build-posts.cjs");
  const run = () => {
    if (existsSync(script)) {
      execFileSync("node", [script], { stdio: "inherit" });
    }
  };
  return {
    name: "build-posts",
    buildStart: run,
    configureServer(server) {
      server.middlewares.use('/__rebuild', (req, res) => {
        try {
          run();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      const postsDir = resolve(__dirname, "posts");
      const guidesDir = resolve(__dirname, "guides");
      server.watcher.add(postsDir);
      server.watcher.add(guidesDir);
      server.watcher.on("change", (file) => {
        if (file.startsWith(postsDir) || file.startsWith(guidesDir)) {
          run();
        }
      });
      run();
    },
  };
}

export default defineConfig({
  plugins: [buildPostsPlugin(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://vet-research-301313738047.us-central1.run.app',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: "dist",
  },
});
