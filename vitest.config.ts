import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/backend/**',
        'src/services/**',
        'src/lib/**',
        'src/hooks/**',
        'src/store/**',
        'src/components/**',
        'src/features/**',
      ],
      exclude: [
        'src/tests/**',
        'src/backend/lib/firebaseAdmin.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
