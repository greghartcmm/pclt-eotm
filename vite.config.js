import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Update 'pclt-eotm' to match your actual GitHub repo name
  base: '/pclt-eotm/',
})
