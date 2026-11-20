import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no matchMedia; default to a light-theme, no-motion-preference system.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

// jsdom does not implement scrolling (used by ScrollRestoration).
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
});
