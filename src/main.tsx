import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'

const root = createRoot(document.getElementById('root')!)

// 개발 서버에서만: ?avatar-preview 로 캐릭터 그림 미리보기
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('avatar-preview')) {
  void import('./ui/AvatarPreview').then(({ AvatarPreview }) => root.render(<AvatarPreview />))
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
