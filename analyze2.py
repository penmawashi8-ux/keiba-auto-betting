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
                'invest':      int(r['invest']),
                'payout':      int(r['payout']),
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
    invest1  = len(rows) * 100
    payout1  = sum(r['top1_payout'] for r in rows)
    roi1     = payout1 / invest1 * 100

    investP  = sum(r['invest'] for r in rows)
    payoutP  = sum(r['payout'] for r in rows)
    roiP     = payoutP / investP * 100 if investP else 0

    hits     = sum(r['top1_hit'] for r in rows)
    hrate    = hits / len(rows) * 100
    profitP  = payoutP - investP

    m1 = ' ***' if roi1  >= 105 else (' **' if roi1  >= 100 else (' *' if roi1  >= 95 else ''))
    mP = ' ***' if roiP >= 105 else (' **' if roiP >= 100 else (' *' if roiP >= 95 else ''))
    print(f'  {label:<50} {len(rows):4d}R  top1={roi1:6.1f}%{m1}  port={roiP:6.1f}%{mP}  hit={hrate:5.1f}%  profit={profitP:+,}')

def run(path):
    rows = load(path)
    valid = [r for r in rows if r['surface']]
    print(f'total: {len(rows)} rows (with meta: {len(valid)})\n')
    print(f'  {"label":<50} {"races":>5}   top1=ROI(1番人気単勝)  port=ROI(ヽートフォリオ)\n')

    SURF = {'\u82dd': 'Turf', '\u30c0\u30fc\u30c8': 'Dirt'}
    CLS  = {
        '\u65b0\u99ac': 'Maiden-debut', '\u672a\u52dd\u5229': 'Maiden',
        '1\u52dd': '1win', '2\u52dd': '2win', '3\u52dd': '3win',
        'OP': 'Open', 'G3': 'G3', 'G2': 'G2', 'G1': 'G1'
    }

    print('='*80)
    print('[1] Turf vs Dirt')
    print('='*80)
    for surf, slabel in SURF.items():
        sub = [r for r in valid if r['surface'] == surf]
        show(slabel, sub, min_races=1)

    print()
    print('='*80)
    print('[2] Distance band')
    print('='*80)
    bands = ['sprint(~1200)', 'mile(1201-1600)', 'middle(1601-2000)', 'long(2001-2400)', 'ultralong(2401~)']
    for band in bands:
        for surf, slabel in list(SURF.items()) + [('', 'All')]:
            sub = [r for r in valid if r['dist_band'] == band and (surf == '' or r['surface'] == surf)]
            show(f'{band} {slabel}', sub)

    print()
    print('='*80)
    print('[3] Race class')
    print('='*80)
    for cls, clabel in CLS.items():
        sub = [r for r in valid if r['race_class'] == cls]
        show(clabel, sub, min_races=10)

    print()
    print('='*80)
    print('[4] Venue')
    print('='*80)
    venues = sorted(set(r['venue'] for r in valid if r['venue']))
    for v in venues:
        sub = [r for r in valid if r['venue'] == v]
        show(v, sub, min_races=1)

    print()
    print('='*80)
    print('[5] Combo conditions (>=30 races, sorted by portfolio ROI)')
    print('='*80)
    combos = defaultdict(list)
    for r in valid:
        key = f"{SURF.get(r['surface'], r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'], r['race_class'] or 'unknown')}"
        combos[key].append(r)

    results = []
    for key, sub in combos.items():
        if len(sub) < 30:
            continue
        investP = sum(r['invest'] for r in sub)
        payoutP = sum(r['payout'] for r in sub)
        roiP = payoutP / investP * 100 if investP else 0
        results.append((roiP, key, sub))

    for roiP, key, sub in sorted(results, reverse=True)[:20]:
        show(key, sub, min_races=1)

    print()
    print('='*80)
    print('[6] Top conditions x spread threshold (>=20 races)')
    print('='*80)
    for _, key, sub in sorted(results, reverse=True)[:5]:
        print(f'\n  condition: {key}')
        for th in [3.0, 5.0, 8.0, 10.0]:
            filtered = [r for r in sub if r['spread'] >= th]
            show(f'    spread>={th:.0f}', filtered, min_races=20)

    print()
    print('* = >=95%  ** = >=100%  *** = >=105%')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'backtest_all_enriched.csv'
    run(path)
