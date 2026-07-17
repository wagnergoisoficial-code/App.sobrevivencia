import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline survival capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[Bunker OS] Service Worker registrado com sucesso no escopo:', reg.scope);
        
        // Force update check on load to detect changes immediately
        reg.update();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New version installed! Reload to apply immediately
                  console.log('[Bunker OS] Nova versão detectada! Recarregando página...');
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((err) => {
        console.error('[Bunker OS] Falha ao registrar o Service Worker offline:', err);
      });
  });
}

