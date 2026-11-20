import { useI18n } from '../../i18n/I18nProvider.jsx';
import { CheckIcon } from './icons.jsx';
import styles from './Stepper.module.css';

/**
 * Progress through a multi-step form: a filled bar, numbered steps, and the
 * current step announced as "Step 2 of 4". Finished steps can be revisited.
 */
export function Stepper({ steps, current, onSelect }) {
  const { t, formatters } = useI18n();
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <nav className={styles.stepper} aria-label={t('wizard.progress')}>
      <p className={styles.count}>{t('wizard.stepOf', { current: formatters.integer(current + 1), total: formatters.integer(steps.length) })}</p>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ inlineSize: `${progress}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo';
          const content = (
            <>
              <span className={styles.marker} aria-hidden="true">
                {state === 'done' ? <CheckIcon size={16} /> : formatters.integer(index + 1)}
              </span>
              <span className={styles.label}>{step.label}</span>
              {state === 'done' && <span className="visually-hidden">{t('wizard.done')}</span>}
            </>
          );
          return (
            <li key={step.key} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' && onSelect ? (
                <button type="button" className={styles.stepButton} onClick={() => onSelect(index)}>
                  {content}
                </button>
              ) : (
                <span className={styles.stepButton}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
