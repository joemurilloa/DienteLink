
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { legacyHashToPath } from './lib/legacyHash';

function applyLegacyHash() {
  const path = legacyHashToPath(window.location.hash);
  if (path) window.location.replace(`${path}${window.location.search}`);
}
applyLegacyHash();
window.addEventListener('hashchange', applyLegacyHash);

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
