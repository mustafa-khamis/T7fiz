import { createContext, useContext, useMemo } from 'react';
import { config } from '../config/env.js';
import { createAuthClient } from '../lib/api.js';

/**
 * External services are provided through context so tests can substitute
 * fakes without module mocking. The authenticated API client is created by
 * AuthProvider, because it needs the in-memory access token.
 */
const ServicesContext = createContext(null);

export function createDefaultServices() {
  return { authClient: createAuthClient({ baseUrl: config.apiBaseUrl }), apiBaseUrl: config.apiBaseUrl };
}

export function ServicesProvider({ services, children }) {
  const value = useMemo(() => services ?? createDefaultServices(), [services]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) throw new Error('useServices must be used inside <ServicesProvider>');
  return context;
}
