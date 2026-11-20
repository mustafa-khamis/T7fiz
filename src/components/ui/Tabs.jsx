import { useId, useRef } from 'react';
import styles from './Tabs.module.css';

/**
 * WAI-ARIA tabs: arrow keys move between tabs (in reading direction), Home
 * and End jump, only the selected tab is in the tab order.
 * tabs: [{ id, label, count? }]
 */
export function Tabs({ tabs, selected, onSelect, label, children }) {
  const baseId = useId();
  const refs = useRef({});

  function onKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.id === selected);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = null;
    if (event.key === forward) next = tabs[(index + 1) % tabs.length];
    else if (event.key === backward) next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs.at(-1);
    if (!next) return;
    event.preventDefault();
    onSelect(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-${tab.id}`}
            aria-selected={tab.id === selected}
            aria-controls={`${baseId}-${tab.id}-panel`}
            tabIndex={tab.id === selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && <span className={styles.count}>{tab.count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-${selected}-panel`} aria-labelledby={`${baseId}-${selected}`} className={styles.panel} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
