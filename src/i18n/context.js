import { createContext } from 'react';

/**
 * The locale context lives in its own module so that editing dictionaries or
 * the provider (hot reload in development) never creates a second context
 * object, which would leave consumers looking at an empty one.
 */
export const I18nContext = createContext(null);
