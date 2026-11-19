"""Import parsed Steam PC requirements from the 'Steam Dataset 2025' CSV package (Zenodo 17266923).

The applications table carries mat_pc_*_min / mat_pc_*_rec columns already extracted from
Steam's pc_requirements JSON. Rows are joined to the repack catalogue by Steam appid, and only
repacks that the live Steam pass has not covered are added.

Usage: python scripts/zenodo-requirements.py [.tmp/steam2025.zip]
"""
import csv
import io
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

ZIP = Path(sys.argv[1] if len(sys.argv) > 1 else '.tmp/steam2025.zip')
OUT = Path('.tmp/reqs.jsonl')
MAP = Path('.tmp/appid-map.json')

if not ZIP.exists():
    sys.exit(f'missing {ZIP}')

# --- same-game rules, mirroring scripts/lib/titles.mjs (sequel-safe) ---
EDITION_WORDS = {
    'edition', 'definitive', 'deluxe', 'ultimate', 'gold', 'premium', 'complete', 'remastered',
    'remaster', 'remake', 'goty', 'game', 'of', 'year', 'digital', 'standard', 'enhanced', 'bundle',
    'pack', 'plus', 'collection', 'trilogy', 'hd', 'vr', 'windows', 'the', 'a', 'an', 'and',
    'anniversary', 'special', 'extended', 'redux', 'directors', 'cut', 'black', 'blitz', 'classic',
    'old', 'free', 'demo',
}
ROMAN = {'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10}
YEAR = re.compile(r'^(19|20)\d{2}$')


def fold(s):
    s = re.sub(r'[™®©]', ' ', str(s or ''))
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c))


def tokens(s):
    s = fold(s).lower().replace('&', ' and ')
    s = re.sub(r"['’`]", '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return [t for t in s.split() if t]


def core_tokens(s):
    return [t for t in tokens(s) if t not in EDITION_WORDS and not YEAR.match(t)]


def core_key(s):
    return ' '.join(sorted(core_tokens(s)))


def sequel_numbers(s):
    out = set()
    for t in tokens(s):
        if re.match(r'^\d{1,2}$', t):
            out.add(int(t))
        elif t in ROMAN:
            out.add(ROMAN[t])
    return out


def same_game(a, b):
    ka, kb = core_key(a), core_key(b)
    return bool(ka) and ka == kb and sequel_numbers(a) == sequel_numbers(b)


def clean_title(t):
    s = re.sub(r'^#?\d{3,5}\s*', '', str(t or ''))
    s = re.sub(r'\((switch 2?|switch|ps4|ps5|xbox[^)]*)\)', '', s, flags=re.I)
    s = re.sub(r',(?!\s*\d)\s*(build[_ ]?[\w.]+|v\d[\w.]*)\b.*$', '', s, flags=re.I)
    s = re.sub(r'\s*[+–-]\s*(\d+\s*)?(dlcs?|bonuses?|multiplayer|switch 2? emulator)\b.*$', '', s, flags=re.I)
    s = s.split(',')[0]
    s = re.split(r'\s+[–—]\s+', s)[0]
    return re.sub(r'[:\-–—]+\s*$', '', s).strip()

with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    print('archive:', ', '.join(n for n in names if n.lower().endswith('.csv')) or names[:6])
    target = next((n for n in names if re.search(r'applications?\.csv$', n, re.I)), None)
    if target is None:
        target = next((n for n in names if n.lower().endswith('.csv') and 'applic' in n.lower()), None)
    if target is None:
        sys.exit('no applications csv found in archive')

    appid_to_url = {}
    for url, appid in json.loads(MAP.read_text(encoding='utf-8')).items():
        appid_to_url.setdefault(int(appid), url)

    titles = {}
    raw_path = Path('.tmp/raw.jsonl')
    if raw_path.exists():
        for line in raw_path.read_text(encoding='utf-8').splitlines():
            if line.strip():
                try:
                    row = json.loads(line)
                    titles.setdefault(row['url'], row.get('title'))
                except Exception:
                    pass

    # 1. drop earlier rows whose Steam name does not name the same game
    covered = set()
    if OUT.exists():
        kept, dropped = [], 0
        for line in OUT.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except Exception:
                continue
            title = titles.get(row['url'])
            name = row.get('name')
            if title and name and not same_game(clean_title(title), name):
                dropped += 1
                continue
            kept.append(line)
            covered.add(row['url'])
        if dropped:
            OUT.write_text('\n'.join(kept) + '\n', encoding='utf-8')
        print(f'validated existing rows: dropped {dropped}, kept {len(kept)}')

    FIELD = [
        ('os', re.compile(r'(os|operating_system)', re.I)),
        ('cpu', re.compile(r'(processor|cpu)', re.I)),
        ('ram', re.compile(r'(memory|ram)', re.I)),
        ('gpu', re.compile(r'(graphics|video_card|gpu)', re.I)),
        ('storage', re.compile(r'(storage|hard_drive|hard_disk|disk)', re.I)),
        ('dx', re.compile(r'(directx|direct_x)', re.I)),
    ]

    with z.open(target) as raw:
        text = io.TextIOWrapper(raw, encoding='utf-8', errors='replace', newline='')
        reader = csv.DictReader(text)
        cols = [c for c in (reader.fieldnames or [])]
        lower = {c.lower(): c for c in cols}

        appid_col = next((lower[k] for k in ('appid', 'steam_appid', 'app_id') if k in lower), None)
        name_col = lower.get('name')
        if not appid_col:
            sys.exit(f'no appid column; first columns: {cols[:8]}')

        min_cols, rec_cols = {}, {}
        for c in cols:
            m = re.match(r'^mat_pc_(.+?)_(min|minimum|rec|recommended)$', c, re.I)
            if not m:
                continue
            part, side = m.group(1), ('min' if m.group(2).lower().startswith('min') else 'rec')
            for key, rx in FIELD:
                if rx.search(part):
                    (min_cols if side == 'min' else rec_cols)[key] = c

        print('appid column:', appid_col)
        print('min fields:', {k: v for k, v in min_cols.items()})
        print('rec fields:', {k: v for k, v in rec_cols.items()})
        if not min_cols and not rec_cols:
            sys.exit('no mat_pc_* requirement columns in this CSV')

        def clean(v):
            if v is None:
                return None
            s = re.sub(r'\s+', ' ', str(v)).strip()
            return s[:300] if s and s.lower() != 'null' and s != '-' else None

        rows = matched = 0
        batch = []
        with OUT.open('a', encoding='utf-8') as out:
            for row in reader:
                rows += 1
                if rows % 50000 == 0:
                    print(f'  scanned {rows} rows, matched {matched}', flush=True)
                try:
                    appid = int(float(row.get(appid_col) or 0))
                except (TypeError, ValueError):
                    continue
                if not appid:
                    continue
                url = appid_to_url.get(appid)
                if not url or url in covered:
                    continue
                row_name = clean(row.get(name_col)) if name_col else None
                repack_title = titles.get(url)
                if row_name and repack_title and not same_game(clean_title(repack_title), row_name):
                    continue
                mn = {k: clean(row.get(c)) for k, c in min_cols.items()}
                rc = {k: clean(row.get(c)) for k, c in rec_cols.items()}
                mn = {k: v for k, v in mn.items() if v}
                rc = {k: v for k, v in rc.items() if v}
                if not mn and not rc:
                    continue
                covered.add(url)
                matched += 1
                batch.append(json.dumps({
                    'url': url,
                    'appid': appid,
                    'name': row_name,
                    'min': mn or None,
                    'rec': rc or None,
                    'genres': [],
                    'source': 'steam-dataset-2025',
                }, ensure_ascii=False))
                if len(batch) >= 500:
                    out.write('\n'.join(batch) + '\n')
                    batch = []
            if batch:
                out.write('\n'.join(batch) + '\n')

print(f'rows={rows} imported={matched}')
