import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SVGComposer',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'svg-composer.esm.js';
        if (format === 'umd') return 'svg-composer.js';
        return `svg-composer.${format}.js`;
      },
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    outDir: 'dist',
  },
});
