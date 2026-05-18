import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from '@tailwindcss/vite';

import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      reactRouter(),
      tailwindcss(),

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
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
