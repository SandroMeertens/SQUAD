import { defineConfig } from 'vite';

// Firebase Hosting serves from /; GitHub Pages previews from /SQUAD/.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/SQUAD/' : '/',
});
