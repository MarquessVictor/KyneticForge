import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { log } from '@/stores/logStore';
import '@/styles/index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

log.info('KyneticForge Studio started — default 3-DOF arm loaded');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
