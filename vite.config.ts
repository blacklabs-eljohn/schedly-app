import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Custom Vite Plugin to automatically inject all compiled JS/CSS bundles and assets
 * into the Service Worker precache manifest so the PWA works 100% offline with 0ms launch time.
 */
function pwaPrecachePlugin(): Plugin {
  return {
    name: 'pwa-precache-generator',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      if (!fs.existsSync(distDir)) return;

      const assets: string[] = ['/', '/index.html'];

      function walkDir(dir: string, baseDir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath, baseDir);
          } else {
            const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
            // Skip sw.js itself to avoid self-referencing loop
            if (relPath === '/sw.js') continue;
            // Precache JS, CSS, PNG, SVG, JSON, ICO, WEBP, WOFF2, HTML
            if (/\.(js|css|png|svg|json|ico|webp|woff2|html)$/i.test(relPath)) {
              if (!assets.includes(relPath)) {
                assets.push(relPath);
              }
            }
          }
        }
      }

      walkDir(distDir, distDir);

      const buildHash = 'v' + Date.now().toString(36);
      const swTemplatePath = path.resolve(process.cwd(), 'public/sw.js');
      if (!fs.existsSync(swTemplatePath)) return;

      let swContent = fs.readFileSync(swTemplatePath, 'utf-8');

      // Inject the generated assets array and build version into the built service worker
      swContent = swContent.replace(
        /const CACHE_VERSION = ['"][^'"]*['"];/,
        `const CACHE_VERSION = '${buildHash}';`
      );
      swContent = swContent.replace(
        /const PRECACHE_ASSETS = \[[^\]]*\];/s,
        `const PRECACHE_ASSETS = ${JSON.stringify(assets, null, 2)};`
      );

      const targetSwDist = path.join(distDir, 'sw.js');
      fs.writeFileSync(targetSwDist, swContent, 'utf-8');
      console.log(`[PWA Plugin] Precached ${assets.length} production assets in ${targetSwDist} (Version: ${buildHash})`);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pwaPrecachePlugin()],
});
