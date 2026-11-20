import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import { Button } from '../components/ui/Button.jsx';
import styles from './NotFoundPage.module.css';

/** Eight-pointed star (khatam): 16 vertices alternating outer and inner radius. */
function starPoints(cx, cy, outer, inner) {
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

// Fixed star field (deterministic, so the page looks the same on every visit).
const SKY = [
  [6, 18, 1.4], [14, 8, 1], [22, 30, 1.2], [31, 12, 0.8], [38, 24, 1.5], [47, 6, 1], [58, 20, 0.9], [64, 9, 1.3],
  [72, 28, 1], [79, 14, 1.4], [86, 6, 0.9], [93, 22, 1.2], [10, 40, 0.8], [27, 46, 1], [69, 42, 0.9], [90, 38, 1.1],
];

// Footprints along a path that fades into the dunes and stops.
const PRINTS = [
  [1060, 292, -18], [1022, 280, -14], [985, 270, -10], [948, 262, -6], [911, 256, -3], [874, 252, 0], [837, 250, 3], [800, 250, 6],
];

/**
 * 404 — "the caravan lost its way". A dusk desert: layered dunes, a trail of
 * footprints that ends, and a guiding eight-pointed star holding the number.
 * The scene follows the pointer a little (parallax) unless reduced motion is
 * preferred. All text is localized; numerals follow the active language.
 */
export function NotFoundPage() {
  const { t, locale, formatters } = useI18n();
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const sceneRef = useRef(null);
  const [canGoBack] = useState(() => typeof window !== 'undefined' && window.history.length > 1);
  const code = locale === 'ar' ? formatters.integer(404).replace(/[٬,]/g, '') : '404';

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = scene.getBoundingClientRect();
        scene.style.setProperty('--px', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
        scene.style.setProperty('--py', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <div ref={sceneRef} className={styles.scene} aria-hidden="true">
        <svg className={styles.sky} viewBox="0 0 100 50" preserveAspectRatio="xMidYMid slice">
          {SKY.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * 0.32} className={styles.skyStar} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
          ))}
        </svg>

        <div className={styles.starWrap}>
          <svg className={styles.star} viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="112" className={styles.ringOuter} />
            <g className={styles.ringSpin}>
              <circle cx="120" cy="120" r="102" className={styles.ringDashed} />
            </g>
            <polygon points={starPoints(120, 120, 96, 74)} className={styles.khatam} />
            <polygon points={starPoints(120, 120, 80, 62)} className={styles.khatamInner} />
            <circle cx="120" cy="120" r="56" className={styles.core} />
          </svg>
          <span className={styles.code} lang={locale}>
            {code}
          </span>
        </div>

        <svg className={styles.dunes} viewBox="0 0 1200 320" preserveAspectRatio="none">
          <path className={styles.duneFar} d="M0 150 C 180 90 330 120 470 140 S 760 80 930 120 S 1120 150 1200 120 V320 H0Z" />
          <path className={styles.duneMid} d="M0 210 C 200 160 360 190 520 200 S 820 150 1000 190 S 1150 210 1200 200 V320 H0Z" />
          <path className={styles.duneNear} d="M0 262 C 240 228 420 252 600 248 S 950 226 1200 258 V320 H0Z" />
          <g className={styles.prints}>
            {PRINTS.map(([x, y, rotate], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${rotate})`} style={{ opacity: 1 - i * 0.11 }}>
                <ellipse cx="-6" cy={i % 2 ? 3 : -3} rx="5.5" ry="3.4" />
                <ellipse cx="7" cy={i % 2 ? -3 : 3} rx="5.5" ry="3.4" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>{t('notFound.eyebrow', { code })}</p>
        <h1 id="not-found-title" className={styles.title}>
          {t('notFound.title')}
        </h1>
        <p className={styles.body}>{t('notFound.body')}</p>
        <p className={styles.path}>
          <span>{t('notFound.requested')}</span>{' '}
          <code dir="ltr">{`${pathname}${search}`}</code>
        </p>
        <div className={styles.actions}>
          <Button to="/">{t('notFound.home')}</Button>
          {auth.status === 'signedIn' ? (
            <Button to="/account" variant="secondary">
              {t('notFound.account')}
            </Button>
          ) : (
            <Button to="/sign-up" variant="secondary">
              {t('notFound.join')}
            </Button>
          )}
          {canGoBack && (
            <Button variant="quiet" onClick={() => navigate(-1)}>
              {t('notFound.back')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
