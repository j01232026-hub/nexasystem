import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LiffAuthProvider } from './context/LiffAuthContext'
import App from './App.jsx'
import './index.css'
import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/fill'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LiffAuthProvider>
        <App />
      </LiffAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)