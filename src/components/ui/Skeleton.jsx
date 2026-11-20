import { useI18n } from '../../i18n/I18nProvider.jsx';
import fieldStyles from './Field.module.css';
import styles from './Skeleton.module.css';

/**
 * Loading placeholders in the exact shape and position of the content they
 * stand for, so nothing jumps when the real content arrives.
 *
 * - <SkeletonRegion> wraps a whole skeleton: it is the one element assistive
 *   technology hears ("Loading…", aria-busy); the shapes themselves are hidden.
 * - Shapes reuse the real components' sizes (the control height, the label
 *   line height, the avatar size) instead of guessing.
 * - The shimmer travels in the reading direction and stops under
 *   prefers-reduced-motion.
 */
export function SkeletonRegion({ label, className = '', children, as: Tag = 'div' }) {
  const { t } = useI18n();
  return (
    <Tag className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label ?? t('common.states.loading')}</span>
      <div aria-hidden="true" className={styles.contents}>
        {children}
      </div>
    </Tag>
  );
}

/** A rectangle. `width` accepts any CSS length; `radius`: sm | md | lg | pill. */
export function Bone({ width = '100%', height = '1rem', radius = 'sm', className = '', style }) {
  return <span className={`${styles.bone} ${styles[radius]} ${className}`} style={{ inlineSize: width, blockSize: height, ...style }} />;
}

export function Circle({ size = '4.5rem' }) {
  return <span className={`${styles.bone} ${styles.circle}`} style={{ inlineSize: size, blockSize: size }} />;
}

/**
 * Text lines sized to the type scale: the bar is the glyph height, the gap is
 * the leading, so a paragraph skeleton occupies the paragraph's space.
 * `widths` sets each line's length (the last line is usually shorter).
 */
export function Lines({ size = 'body', widths = ['100%', '92%', '64%'] }) {
  return (
    <span className={`${styles.lines} ${styles[`text-${size}`]}`}>
      {widths.map((width, index) => (
        <span key={index} className={styles.line}>
          <span className={`${styles.bone} ${styles.sm}`} style={{ inlineSize: width }} />
        </span>
      ))}
    </span>
  );
}

/** A form field: label line, control box of the real height, optional hint line. */
export function FieldBone({ labelWidth = '6rem', hint = false, readOnly = false }) {
  return (
    <span className={fieldStyles.field}>
      <Lines size="small" widths={[labelWidth]} />
      <span className={`${styles.bone} ${styles.md} ${readOnly ? styles.flat : styles.control}`} />
      {hint && <Lines size="small" widths={['70%']} />}
    </span>
  );
}

export function ButtonBone({ width = '7rem', size = 'md', block = false }) {
  return <span className={`${styles.bone} ${styles.md} ${size === 'sm' ? styles.buttonSm : styles.button}`} style={{ inlineSize: block ? '100%' : width }} />;
}
