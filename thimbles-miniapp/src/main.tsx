import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@telegram-apps/sdk'
import './index.css'
import App from './App'

try {
  init()
} catch {
  // Running outside Telegram during local development is expected.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
