import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './fetchInterceptor.ts'
import App from './App.tsx'
import ToastContainer from './components/ToastNotification'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastContainer />
  </StrictMode>,
)
