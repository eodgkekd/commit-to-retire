/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  // 봇이 한 판을 끝까지 도는 테스트가 느린 PC에서 기본 5초를 넘긴다
  test: { testTimeout: 30_000 },
})
