import { BrandLogo } from '../../components/brand/BrandLogo.jsx';
import styles from './auth.module.css';

/** Shared frame for authentication screens. */
export function AuthScreen({ title, subtitle, children, footer }) {
  return (
    <section className={styles.screen} aria-labelledby="auth-title">
      <header className={styles.header}>
        <BrandLogo variant="symbol" height={52} decorative className={styles.symbol} />
        <h1 id="auth-title" className={styles.title}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      {children}
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  );
}

export function GoogleIcon() {
  // Brand mark: never mirrored.
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}
