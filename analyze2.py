import csv, sys
from collections import defaultdict

def load(path):
    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            rows.append({
                'race_id':     r['race_id'],
                'date':        r['date'],
                'spread':      float(r['spread']),
                'num_picks':   int(r['num_picks']),
                'top1_hit':    int(r.get('top1_hit', 0)),
                'top1_payout': int(r.get('top1_payout', 0)),
                'top1_odds':   float(r.get('top1_odds', 0)),
                'win_odds':    float(r['win_odds']) if r['win_odds'] else 0,
                'venue':       r.get('venue', ''),
                'surface':     r.get('surface', ''),
                'distance':    int(r.get('distance', 0)),
                'dist_band':   r.get('dist_band', ''),
                'race_class':  r.get('race_class', ''),
            })
    return rows

def show(label, rows, min_races=30):
    if len(rows) < min_races:
        return
    invest = len(rows) * 100
    payout = sum(r['top1_payout'] for r in rows)
    hits   = sum(r['top1_hit'] for r in rows)
    roi    = payout / invest * 100
    hrate  = hits / len(rows) * 100
    profit = payout - invest
    marker = ' ***' if roi >= 105 else (' **' if roi >= 100 else (' *' if roi >= 95 else ''))
    print(f'  {label:<50} {len(rows):4d}R  ROI={roi:6.1f}%{marker}  hit={hrate:5.1f}%  profit={profit:+,}')

def run(path):
    rows = load(path)
    valid = [r for r in rows if r['surface']]
    print(f'total: {len(rows)} rows (with meta: {len(valid)})\n')

    SURF = {'\u82dd': 'Turf', '\u30c0\u30fc\u30c8': 'Dirt'}
    CLS  = {
        '\u65b0\u99ac': 'Maiden-debut', '\u672a\u52dd\u5229': 'Maiden',
        '1\u52dd': '1win', '2\u52dd': '2win', '3\u52dd': '3win',
        'OP': 'Open', 'G3': 'G3', 'G2': 'G2', 'G1': 'G1'
    }

    # 1. surface
    print('='*70)
    print('[1] Turf vs Dirt (top1 100yen win)')
    print('='*70)
    for surf, slabel in SURF.items():
        sub = [r for r in valid if r['surface'] == surf]
        show(slabel, sub, min_races=1)

    # 2. distance band
    print()
    print('='*70)
    print('[2] Distance band (top1 100yen win)')
    print('='*70)
    bands = ['sprint(~1200)', 'mile(1201-1600)', 'middle(1601-2000)', 'long(2001-2400)', 'ultralong(2401~)']
    for band in bands:
        for surf, slabel in list(SURF.items()) + [('', 'All')]:
            sub = [r for r in valid if r['dist_band'] == band and (surf == '' or r['surface'] == surf)]
            show(f'{band} {slabel}', sub)

    # 3. class
    print()
    print('='*70)
    print('[3] Race class (top1 100yen win)')
    print('='*70)
    for cls, clabel in CLS.items():
        sub = [r for r in valid if r['race_class'] == cls]
        show(clabel, sub, min_races=10)

    # 4. venue
    print()
    print('='*70)
    print('[4] Venue (top1 100yen win)')
    print('='*70)
    venues = sorted(set(r['venue'] for r in valid if r['venue']))
    for v in venues:
        sub = [r for r in valid if r['venue'] == v]
        show(v, sub, min_races=1)

    # 5. combo: surface x dist_band x class
    print()
    print('='*70)
    print('[5] Combo conditions (>=30 races, sorted by ROI)')
    print('='*70)
    combos = defaultdict(list)
    for r in valid:
        key = f"{SURF.get(r['surface'], r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'], r['race_class'] or 'unknown')}"
        combos[key].append(r)

    results = []
    for key, sub in combos.items():
        if len(sub) < 30:
            continue
        invest = len(sub) * 100
        payout = sum(r['top1_payout'] for r in sub)
        roi = payout / invest * 100
        results.append((roi, key, sub))

    for roi, key, sub in sorted(results, reverse=True)[:20]:
        show(key, sub, min_races=1)

    # 6. top combos x spread threshold
    print()
    print('='*70)
    print('[6] Top conditions x spread threshold (>=20 races)')
    print('='*70)
    for _, key, sub in sorted(results, reverse=True)[:5]:
        print(f'\n  condition: {key}')
        for th in [3.0, 5.0, 8.0, 10.0]:
            filtered = [r for r in sub if r['spread'] >= th]
            show(f'    spread>={th:.0f}', filtered, min_races=20)

    print()
    print('* = ROI>=95%  ** = ROI>=100%  *** = ROI>=105%')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'backtest_all_enriched.csv'
    run(path)
