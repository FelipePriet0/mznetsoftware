import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suprimir warnings de desenvolvimento em produção
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

createRoot(document.getElementById("root")!).render(<App />);
