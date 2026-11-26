// T-45: primer import, antes de cualquier módulo que pueda usar zod.
import '@mi-app/shared/zod-csp';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App.tsx';
import { boot } from './session/store.ts';
import './ui/tokens.css';
import './ui/app.css';

void boot();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
