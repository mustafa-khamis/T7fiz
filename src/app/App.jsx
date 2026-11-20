import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ServicesProvider } from './services.jsx';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import { ThemeProvider } from '../theme/ThemeProvider.jsx';
import { AuthProvider } from '../features/auth/AuthProvider.jsx';
import { MeProvider } from '../features/account/MeProvider.jsx';
import { routes } from './routes.jsx';

/** Provider order: services → locale/theme → session → profile → routes. */
export function AppProviders({ services, children }) {
  return (
    <ServicesProvider services={services}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <MeProvider>{children}</MeProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </ServicesProvider>
  );
}

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), []);
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
