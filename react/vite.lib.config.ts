import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Library build — produces a distributable npm package.
// Run: npm run build:lib
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PdfBlock',
      formats: ['es', 'cjs'],
      fileName: (format) => `pdf-block.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        'zustand/middleware',
        /^@tiptap\//,
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          zustand: 'zustand',
        },
      },
    },
    sourcemap: true,
    outDir: 'dist',
  },
});
