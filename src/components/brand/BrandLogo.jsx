import { useI18n } from '../../i18n/I18nProvider.jsx';
import lockupRightColor from '../../assets/brand/lockup-right-color.svg';
import lockupRightDark from '../../assets/brand/lockup-right-for-dark-bg.svg';
import lockupLeftColor from '../../assets/brand/lockup-left-color.svg';
import lockupLeftDark from '../../assets/brand/lockup-left-for-dark-bg.svg';
import stackedColor from '../../assets/brand/stacked-color.svg';
import stackedDark from '../../assets/brand/stacked-for-dark-bg.svg';
import symbolColor from '../../assets/brand/symbol-color.svg';
import symbolDark from '../../assets/brand/symbol-for-dark-bg.svg';
import styles from './BrandLogo.module.css';

// Intrinsic aspect ratios from the logo kit (width / height) so space is reserved before load.
const ARTWORK = {
  // Arabic reads right to left: the symbol leads on the right ("logo-right", the kit's natural Arabic order).
  'lockup-rtl': { light: lockupRightColor, dark: lockupRightDark, ratio: 338.722 / 116 },
  'lockup-ltr': { light: lockupLeftColor, dark: lockupLeftDark, ratio: 338.722 / 116 },
  stacked: { light: stackedColor, dark: stackedDark, ratio: 1 },
  symbol: { light: symbolColor, dark: symbolDark, ratio: 1 },
};

/**
 * The T7fiz logo from the brand kit.
 *  - variant: 'lockup' (symbol + name, follows the reading direction), 'stacked', 'symbol'
 *  - The colour version shows on light backgrounds and the "for dark background"
 *    version in dark mode (system preference or the user's explicit choice).
 *  - One accessible name ("تحفيظ" / "T7fiz"); `decorative` hides it when the
 *    name is already given nearby.
 */
export function BrandLogo({ variant = 'lockup', height = 40, decorative = false, className = '' }) {
  const { t, locale } = useI18n();
  const key = variant === 'lockup' ? (locale === 'ar' ? 'lockup-rtl' : 'lockup-ltr') : variant;
  const art = ARTWORK[key];
  const width = Math.round(height * art.ratio);
  return (
    <span
      className={`${styles.logo} ${className}`}
      style={{ inlineSize: `${width}px`, blockSize: `${height}px` }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': t('common.appName') })}
    >
      <img className={styles.onLight} src={art.light} alt="" width={width} height={height} decoding="async" draggable="false" />
      <img className={styles.onDark} src={art.dark} alt="" width={width} height={height} decoding="async" draggable="false" />
    </span>
  );
}
