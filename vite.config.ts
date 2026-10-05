import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from '@tailwindcss/vite';

import path from 'path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

function versionServiceWorker() {
  return {
    name: 'version-service-worker',
    apply: 'build' as const,
    async writeBundle(options: { dir?: string }) {
      const outputDir = options.dir ?? path.resolve(__dirname, 'dist');
      const workerPath = path.resolve(outputDir, 'sw.js');
      if (!existsSync(workerPath)) return;
      const worker = await readFile(workerPath, 'utf8');
      await writeFile(workerPath, worker.replace('__BUILD_ID__', `${Date.now()}`));
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      reactRouter(),
      tailwindcss(),
      versionServiceWorker(),

    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    ssr: {
      noExternal: ['react-router'],
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, 'app'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
