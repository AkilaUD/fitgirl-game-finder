// Shared title normalisation and "is this the same game?" checks.
// The whole point is to refuse sequels: "The Outer Worlds" must never match "The Outer Worlds 2",
// and "Layers of Fear 2" must not fall back to the 2016 original.

const EDITION_WORDS = new Set([
  'edition', 'definitive', 'deluxe', 'ultimate', 'gold', 'premium', 'complete', 'remastered',
  'remaster', 'remake', 'goty', 'game', 'of', 'year', 'digital', 'standard', 'enhanced', 'bundle',
  'pack', 'plus', 'collection', 'trilogy', 'hd', 'vr', 'windows', 'the', 'a', 'an', 'and',
  'anniversary', 'special', 'extended', 'redux', 'directors', 'cut', 'black', 'blitz', 'classic',
  'old', 'free', 'demo',
]);

const ROMAN = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const YEAR = /^(19|20)\d{2}$/;

export function foldAccents(s) {
  // ™/® decompose to "TM"/"R" under NFKD and would glue onto neighbouring words.
  return String(s || '').replace(/[™®©]/g, ' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/** Strips the repack wrapping: "#4439", ", v1.2", "Build 1835", "+ 4 DLCs", "(Switch 2)". */
export function cleanTitle(t) {
  let s = String(t || '').replace(/^#?\d{3,5}\s*/, '');
  s = s.replace(/\((switch 2?|switch|ps4|ps5|xbox[^)]*)\)/gi, '');
  s = s.replace(/,(?!\s*\d)\s*(build[_ ]?[\w.]+|v\d[\w.]*)\b.*$/i, '');
  s = s.replace(/\s*[+–-]\s*(\d+\s*)?(dlcs?|bonuses?|multiplayer|switch 2? emulator)\b.*$/i, '');
  s = s.split(',')[0];
  s = s.split(/\s+[–—]\s+/)[0];
  return s.replace(/[:\-–—]+\s*$/, '').trim();
}

export function tokenize(s) {
  return foldAccents(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/\b(tm|r)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** Tokens that actually identify the game: no edition words, no release years. */
export function coreTokens(s) {
  return tokenize(s).filter((t) => !EDITION_WORDS.has(t) && !YEAR.test(t));
}

export function coreKey(s) {
  return coreTokens(s).sort().join(' ');
}

/** Sequel numbers in a title, ignoring years and long build numbers. */
export function sequelNumbers(s) {
  const out = new Set();
  for (const t of tokenize(s)) {
    if (/^\d{1,2}$/.test(t)) out.add(Number(t));
    else if (ROMAN[t]) out.add(ROMAN[t]);
  }
  return out;
}

/**
 * True only when two titles name the same game.
 * Requires identical sequel numbers and the same set of identifying words.
 */
export function sameGame(a, b) {
  const ca = coreKey(a), cb = coreKey(b);
  if (!ca || !cb) return false;
  if (ca !== cb) return false;
  const na = sequelNumbers(a), nb = sequelNumbers(b);
  if (na.size !== nb.size) return false;
  for (const n of na) if (!nb.has(n)) return false;
  return true;
}

/** Similarity score 0..1 used for ranking candidates (identical titles score 1). */
export function titleSimilarity(a, b) {
  const A = new Set(coreTokens(a)), B = new Set(coreTokens(b));
  if (!A.size || !B.size) return 0;
  if (sameGame(a, b)) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return inter / union;
}
