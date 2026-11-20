import { forwardRef } from 'react';
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, WarningIcon } from './icons.jsx';
import styles from './Alert.module.css';

const ICONS = { info: InfoIcon, success: CheckCircleIcon, warning: WarningIcon, danger: AlertCircleIcon };

/**
 * tone: info | success | warning | danger. Errors are announced immediately;
 * others politely. Each tone has its own icon so meaning never relies on colour.
 * Forwarded ref + tabIndex lets a form move focus to a server error.
 */
export const Alert = forwardRef(function Alert({ tone = 'info', title, children, action, ...rest }, ref) {
  const ToneIcon = ICONS[tone] ?? InfoIcon;
  return (
    <div ref={ref} className={`${styles.alert} ${styles[tone]}`} role={tone === 'danger' ? 'alert' : 'status'} {...rest}>
      <span className={styles.icon}>
        <ToneIcon />
      </span>
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
});
