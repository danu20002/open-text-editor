import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build config for packaging `src/editor` as an installable package.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/editor/index.jsx',
      name: 'OpenTextEditor',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Externalize peer deps
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
