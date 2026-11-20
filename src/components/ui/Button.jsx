import { Link } from 'react-router';
import styles from './Button.module.css';

/**
 * variant: primary | secondary | quiet | danger
 * Renders a router <Link> for `to`, a plain <a> for `href` (in-page anchors),
 * otherwise a <button>.
 * While `loading`, the button keeps its width, is disabled, and announces busy state.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  to,
  href,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
