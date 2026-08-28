import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';

// 1. Register High-Performance Service Worker for PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// 2. Request Persistent Storage to prevent iOS/Android storage eviction
if (typeof window !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persisted().then((isPersisted) => {
    if (!isPersisted) {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          console.log('[Storage] Persistent storage granted by browser.');
        }
      });
    }
  }).catch(() => {
    // Ignore
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
);
