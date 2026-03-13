import csv, sys
from collections import defaultdict

def load(path):
    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            rows.append({
                'race_id':     r['race_id'],
                'date':        r['date'],
                'year':        r['date'][:4],
                'spread':      float(r['spread']),
                'invest':      int(r['invest']),
                'payout':      int(r['payout']),
                'top1_hit':    int(r.get('top1_hit', 0)),
                'top1_payout': int(r.get('top1_payout', 0)),
                'top1_odds':   float(r.get('top1_odds', 0)),
                'venue':       r.get('venue', ''),
                'surface':     r.get('surface', ''),
                'dist_band':   r.get('dist_band', ''),
                'race_class':  r.get('race_class', ''),
            })
    return rows

def calc(rows):
    if not rows: return None
    invest = len(rows) * 100
    payout = sum(r['top1_payout'] for r in rows)
    hits   = sum(r['top1_hit'] for r in rows)
    roi    = payout / invest * 100
    hrate  = hits / len(rows) * 100
    profit = payout - invest
    return roi, hrate, profit, len(rows)

def show(label, rows, min_races=20):
    if len(rows) < min_races: return
    res = calc(rows)
    if not res: return
    roi, hrate, profit, n = res
    m = ' ***' if roi >= 105 else (' **' if roi >= 100 else (' *' if roi >= 95 else ''))
    print(f'  {label:<65} {n:4d}R  ROI={roi:6.1f}%{m}  hit={hrate:5.1f}%  profit={profit:+,}')

SURF = {'\u82dd': 'Turf', '\u30c0\u30fc\u30c8': 'Dirt'}
CLS = {
    '\u65b0\u99ac': 'Maiden-debut', '\u672a\u52dd\u5229': 'Maiden',
    '1\u52dd': '1win', '2\u52dd': '2win', '3\u52dd': '3win',
    'OP': 'Open', 'G3': 'G3', 'G2': 'G2', 'G1': 'G1'
}

# top conditions from analyze3 results (odds>=3.0 filter)
TOP_CONDITIONS = [
    ('Turf', 'mile(1201-1600)', 'Maiden-debut'),
    ('Turf', 'ultralong(2401~)', '1win'),
    ('Turf', 'ultralong(2401~)', 'Maiden'),
    ('Dirt', 'middle(1601-2000)', '3win'),
    ('Dirt', 'long(2001-2400)', '3win'),
    ('Turf', 'sprint(~1200)', 'Maiden-debut'),
    ('Dirt', 'sprint(~1200)', 'Maiden-debut'),
    ('Turf', 'middle(1601-2000)', '3win'),
    ('Turf', 'long(2001-2400)', '2win'),
    ('Turf', 'ultralong(2401~)', 'Open'),
]

def key_of(r):
    s = SURF.get(r['surface'], r['surface'])
    c = CLS.get(r['race_class'], r['race_class'] or '?')
    return (s, r['dist_band'], c)

def run(path):
    rows = load(path)
    valid = [r for r in rows if r['surface']]
    years = sorted(set(r['year'] for r in valid))
    venues = sorted(set(r['venue'] for r in valid if r['venue']))
    print(f'total: {len(rows)} rows (with meta: {len(valid)})\n')

    # group by key
    by_key = defaultdict(list)
    for r in valid:
        by_key[key_of(r)].append(r)

    # ============================================================
    # [E] top conditions x year (odds>=3.0)
    # ============================================================
    print('='*75)
    print('[E] Top conditions x YEAR (odds>=3.0, top1 100yen)')
    print('='*75)
    for cond in TOP_CONDITIONS:
        sub = [r for r in by_key[cond] if r['top1_odds'] >= 3.0]
        label = f'{cond[0]} / {cond[1]} / {cond[2]}'
        print(f'\n  {label}  (total: {len(sub)}R)')
        for y in years:
            ysub = [r for r in sub if r['year'] == y]
            show(f'    {y}', ysub, min_races=3)

    # ============================================================
    # [F] top conditions x venue (odds>=3.0)
    # ============================================================
    print()
    print('='*75)
    print('[F] Top conditions x VENUE (odds>=3.0, top1 100yen)')
    print('='*75)
    for cond in TOP_CONDITIONS:
        sub = [r for r in by_key[cond] if r['top1_odds'] >= 3.0]
        label = f'{cond[0]} / {cond[1]} / {cond[2]}'
        print(f'\n  {label}  (total: {len(sub)}R)')
        for v in venues:
            vsub = [r for r in sub if r['venue'] == v]
            show(f'    {v}', vsub, min_races=5)

    # ============================================================
    # [G] 4-way: venue x surface x dist x class x odds>=3.0 (>=20R)
    # ============================================================
    print()
    print('='*75)
    print('[G] 4-way combo x odds>=3.0 (>=20R, sorted by ROI, top30)')
    print('='*75)
    combos4 = defaultdict(list)
    for r in valid:
        if r['top1_odds'] < 3.0: continue
        k = f"{r['venue']} / {SURF.get(r['surface'],r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'],r['race_class'] or '?')}"
        combos4[k].append(r)

    results = []
    for k, sub in combos4.items():
        if len(sub) < 20: continue
        roi, hrate, profit, n = calc(sub)
        results.append((roi, k, sub))

    for roi, k, sub in sorted(results, reverse=True)[:30]:
        show(k, sub, min_races=1)

    # ============================================================
    # [H] year stability of [G] top conditions (min-year ROI)
    # ============================================================
    print()
    print('='*75)
    print('[H] Year stability of top 4-way+odds>=3.0 conditions (sorted by min-year ROI)')
    print('='*75)
    stability = []
    for roi, k, sub in sorted(results, reverse=True)[:30]:
        yr_rois = []
        for y in years:
            ysub = [r for r in sub if r['year'] == y]
            if len(ysub) < 3: continue
            r2 = calc(ysub)
            if r2: yr_rois.append((y, r2[0]))
        if len(yr_rois) < 4: continue
        min_roi = min(r for _, r in yr_rois)
        avg_roi = sum(r for _, r in yr_rois) / len(yr_rois)
        stability.append((min_roi, avg_roi, k, sub, yr_rois))

    stability.sort(reverse=True)
    for min_roi, avg_roi, k, sub, yr_rois in stability[:20]:
        yr_str = '  '.join(f'{y}:{r:.0f}%' for y, r in yr_rois)
        n = len(sub)
        print(f'\n  {k}  ({n}R  avg={avg_roi:.1f}%  min={min_roi:.1f}%)')
        print(f'    {yr_str}')

    print()
    print('* = >=95%  ** = >=100%  *** = >=105%')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'backtest_all_enriched.csv'
    run(path)
