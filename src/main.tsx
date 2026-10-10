import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { purgeLegacyUnscopedStores } from './utils/storage';

// Immediately purge legacy unscoped storage (pre-UID) to eliminate cross-account leakage
purgeLegacyUnscopedStores();

// Register service worker for offline support and PWA capabilities
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

