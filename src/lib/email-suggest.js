/**
 * Suggests a correction for likely typos in common email domains
 * ("gmial.com" → "gmail.com"). Never changes the address by itself: the
 * person accepts the suggestion with one tap.
 */
const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com', 'aol.com', 'proton.me', 'protonmail.com'];
// Endings that are not real top-level domains in practice. (".co" and ".om" are real, so they are left alone.)
const TLD_FIXES = { con: 'com', cpm: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', nett: 'net', ner: 'net', ogr: 'org' };

function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

export function suggestEmail(value) {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (DOMAINS.includes(domain)) return null;

  let best = null;
  for (const candidate of DOMAINS) {
    const d = distance(domain, candidate);
    if (d > 0 && d <= 2 && (!best || d < best.d)) best = { candidate, d };
  }
  if (best) return `${local}@${best.candidate}`;

  const dot = domain.lastIndexOf('.');
  if (dot > 0) {
    const tld = domain.slice(dot + 1);
    if (TLD_FIXES[tld]) return `${local}@${domain.slice(0, dot)}.${TLD_FIXES[tld]}`;
  }
  return null;
}
