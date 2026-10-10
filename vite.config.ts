import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base lets the build work under https://<user>.github.io/<repo>/ without hardcoding the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
});
