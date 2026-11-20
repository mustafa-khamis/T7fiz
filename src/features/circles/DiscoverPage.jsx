import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApiQuery } from '../../lib/useApi.js';
import { TextField, SelectField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, LoadError } from '../../components/ui/Status.jsx';
import { CircleCard } from './CircleCard.jsx';
import styles from './Circles.module.css';
import { GridSkeleton } from './DiscoverSkeletons.jsx';

const PAGE_SIZE = 18;
const LANGUAGES = ['ar', 'en', 'fr', 'ur', 'id', 'tr', 'ms', 'so'];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/**
 * Find a circle (MEM-1): only circles of your own gender that are publicly
 * listed — the API decides; this page only renders what it returns.
 */
export function DiscoverPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const language = params.get('language') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [draft, setDraft] = useState(q);

  // Search as the person types, after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.trim() === q) return;
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set('q', draft.trim());
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, q, params, setParams]);

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), ...(q ? { q } : {}), ...(language ? { language } : {}) });
  const result = useApiQuery(`/api/v1/discover/circles?${query}`);
  const setFilter = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  };

  const totalPages = result.data ? Math.max(1, Math.ceil(result.data.total / PAGE_SIZE)) : 1;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('circles.discoverTitle')}</h1>
        <p className={styles.muted}>{t('circles.discoverSubtitle')}</p>
      </header>

      <div className={styles.filters} role="search">
        <TextField label={t('circles.search')} type="search" icon={SearchIcon} value={draft} onChange={(event) => setDraft(event.target.value)} optional placeholder={t('circles.searchPlaceholder')} />
        <SelectField label={t('circles.language')} optional value={language} onChange={(event) => setFilter('language', event.target.value)}>
          <option value="">{t('circles.anyLanguage')}</option>
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {t(`languageNames.${code}`)}
            </option>
          ))}
        </SelectField>
      </div>

      <div aria-live="polite" aria-busy={result.status === 'loading' || result.refreshing || undefined}>
        {result.status === 'loading' && <GridSkeleton />}
        {result.status === 'error' && <LoadError error={result.error} onRetry={result.reload} />}
        {result.status === 'ready' &&
          (result.data.items.length === 0 ? (
            <EmptyState
              title={q || language ? t('circles.noResults') : t('circles.noneYet')}
              body={q || language ? t('circles.noResultsBody') : t('circles.noneYetBody')}
              action={
                (q || language) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDraft('');
                      setParams(new URLSearchParams());
                    }}
                  >
                    {t('circles.clearFilters')}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <p className={styles.muted}>{t('circles.resultCount', { count: result.data.total })}</p>
              <div className={styles.grid}>
                {result.data.items.map((circle) => (
                  <CircleCard key={circle.id} circle={circle} />
                ))}
              </div>
              {totalPages > 1 && (
                <nav className={styles.pager} aria-label={t('circles.pages')}>
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>
                    {t('circles.previous')}
                  </Button>
                  <span className={styles.muted}>{t('circles.pageOf', { page, total: totalPages })}</span>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}>
                    {t('circles.next')}
                  </Button>
                </nav>
              )}
            </>
          ))}
      </div>
    </div>
  );
}
