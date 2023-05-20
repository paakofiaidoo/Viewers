import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [reactRefresh()],
  build: {
    rollupOptions: {
      // exclude react-dicom-viewer from the bundle
      // external: ['react-dicom-viewer' ]
    },
    minify: false,
  },
  esbuild: {
    loader: 'jsx',
    include: [
      // Add this for business-as-usual behaviour for .jsx and .tsx files
      'src/**/*.jsx',
      'src/**/*.tsx',
    ],
  },
});
