import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync, cpSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HTML pages that Vite builds (migrated to ESM + bundled JSX). Each key is the
// page's directory name at the repo root; the value is its index.html.
// A page graduates from CDN/Babel to Vite by adding an entry here AND it is then
// automatically excluded from the verbatim copy below (Rollup emits it instead).
// Order of migration: member-form -> login -> availability-form -> ideal-form -> dashboard.
// ---------------------------------------------------------------------------
const VITE_PAGES = {
  "member-form": resolve(__dirname, "member-form/index.html"),
  login: resolve(__dirname, "login/index.html"),
  "availability-form": resolve(__dirname, "availability-form/index.html"),
  "ideal-form": resolve(__dirname, "ideal-form/index.html"),
  dashboard: resolve(__dirname, "dashboard/index.html"),
};

// Build/tooling files that must never be copied into dist/.
const EXCLUDE = new Set([
  ".git",
  ".gitignore",
  "node_modules",
  "dist",
  "package.json",
  "package-lock.json",
  "vite.config.js",
]);

// Everything at the repo root that is NOT a migrated page and NOT a build artifact
// is copied into dist/ byte-for-byte. This keeps un-migrated pages (still using the
// React/Babel CDN), the shared/ global scripts, the service worker, images, etc.
// serving from their exact original URLs during the page-by-page migration.
function copyVerbatimPlugin() {
  return {
    name: "copy-verbatim-static",
    apply: "build",
    closeBundle() {
      const migratedDirs = new Set(Object.keys(VITE_PAGES));
      for (const entry of readdirSync(__dirname)) {
        if (EXCLUDE.has(entry)) continue;
        const src = resolve(__dirname, entry);
        const dest = resolve(__dirname, "dist", entry);
        if (migratedDirs.has(entry)) {
          // Vite emits this page's index.html into dist; copy the REST of the
          // directory verbatim (e.g. dashboard/sw.js, manifest.webmanifest) so
          // those static assets keep serving from their original URLs. Never copy
          // the source index.html (Vite owns it) or the main.jsx entry source.
          cpSync(src, dest, {
            recursive: true,
            filter: (s) => {
              const base = s.split(/[\\/]/).pop();
              return base !== "index.html" && base !== "main.jsx";
            },
          });
        } else {
          cpSync(src, dest, { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  root: __dirname,
  // Absolute base so /shared/... , /assets/... and other root-absolute paths resolve.
  base: "/",
  plugins: [react(), copyVerbatimPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Only migrated pages are Vite entries; the vanilla root index.html and all
      // un-migrated pages are placed by the copy plugin instead.
      input: VITE_PAGES,
    },
  },
});
