import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts: the browser downloads only the unicode ranges it needs.
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App.jsx';

// Requests are cancelled on purpose when a page changes; a cancellation that
// escapes through a fetch wrapper (e.g. a browser extension) is not an error.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError') event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
