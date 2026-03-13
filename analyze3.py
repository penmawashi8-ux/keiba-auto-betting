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
                'num_picks':   int(r['num_picks']),
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

def roi1(rows):
    if not rows: return 0
    return sum(r['top1_payout'] for r in rows) / (len(rows)*100) * 100

def show(label, rows, min_races=30):
    if len(rows) < min_races: return
    invest = len(rows) * 100
    payout = sum(r['top1_payout'] for r in rows)
    roi    = payout / invest * 100
    hits   = sum(r['top1_hit'] for r in rows)
    hrate  = hits / len(rows) * 100
    profit = payout - invest
    m = ' ***' if roi >= 105 else (' **' if roi >= 100 else (' *' if roi >= 95 else ''))
    print(f'  {label:<60} {len(rows):4d}R  ROI={roi:6.1f}%{m}  hit={hrate:5.1f}%  profit={profit:+,}')

def run(path):
    rows = load(path)
    valid = [r for r in rows if r['surface']]
    print(f'total: {len(rows)} rows (with meta: {len(valid)})\n')

    SURF = {'\u82dd': 'Turf', '\u30c0\u30fc\u30c8': 'Dirt'}
    CLS = {
        '\u65b0\u99ac': 'Maiden-debut', '\u672a\u52dd\u5229': 'Maiden',
        '1\u52dd': '1win', '2\u52dd': '2win', '3\u52dd': '3win',
        'OP': 'Open', 'G3': 'G3', 'G2': 'G2', 'G1': 'G1'
    }

    # ============================================================
    # [A] top1_odds filter
    # ============================================================
    print('='*72)
    print('[A] top1_odds filter (1ban odds >= threshold, top1 100yen bet)')
    print('='*72)
    for th in [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]:
        sub = [r for r in valid if r['top1_odds'] >= th]
        show(f'top1_odds >= {th:.1f}', sub, min_races=1)

    print()
    print('--- [A] odds filter x combo (>=30R) ---')
    combos = defaultdict(list)
    for r in valid:
        key = f"{SURF.get(r['surface'],r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'],r['race_class'] or '?')}"
        combos[key].append(r)

    for th in [2.0, 2.5, 3.0]:
        print(f'\n  --- odds >= {th} ---')
        results = []
        for key, sub in combos.items():
            filtered = [r for r in sub if r['top1_odds'] >= th]
            if len(filtered) < 20: continue
            invest = len(filtered)*100
            payout = sum(r['top1_payout'] for r in filtered)
            roi = payout/invest*100
            results.append((roi, key, filtered))
        for roi, key, sub in sorted(results, reverse=True)[:10]:
            show(f'  {key}', sub, min_races=1)

    # ============================================================
    # [C] 4-way combo: venue x surface x dist x class
    # ============================================================
    print()
    print('='*72)
    print('[C] 4-way combo: venue x surface x dist_band x class (>=30R, top20 by ROI)')
    print('='*72)
    combos4 = defaultdict(list)
    for r in valid:
        key = f"{r['venue']} / {SURF.get(r['surface'],r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'],r['race_class'] or '?')}"
        combos4[key].append(r)

    results4 = []
    for key, sub in combos4.items():
        if len(sub) < 30: continue
        invest = len(sub)*100
        payout = sum(r['top1_payout'] for r in sub)
        roi = payout/invest*100
        results4.append((roi, key, sub))

    for roi, key, sub in sorted(results4, reverse=True)[:20]:
        show(key, sub, min_races=1)

    # ============================================================
    # [D] year-by-year stability for top 3-way combos
    # ============================================================
    print()
    print('='*72)
    print('[D] Year-by-year ROI for top 3-way combos (sorted by min-year ROI)')
    print('='*72)

    combos3 = defaultdict(list)
    for r in valid:
        key = f"{SURF.get(r['surface'],r['surface'])} / {r['dist_band']} / {CLS.get(r['race_class'],r['race_class'] or '?')}"
        combos3[key].append(r)

    years = sorted(set(r['year'] for r in valid))
    stability = []
    for key, sub in combos3.items():
        if len(sub) < 50: continue
        yr_rois = []
        for y in years:
            ysub = [r for r in sub if r['year'] == y]
            if len(ysub) < 5: continue
            yr_rois.append(roi1(ysub))
        if len(yr_rois) < 5: continue
        min_roi = min(yr_rois)
        avg_roi = sum(yr_rois)/len(yr_rois)
        stability.append((min_roi, avg_roi, key, sub, yr_rois))

    stability.sort(reverse=True)
    for min_roi, avg_roi, key, sub, yr_rois in stability[:15]:
        yr_str = '  '.join(f'{y}:{r:.0f}%' for y, r in zip(years, yr_rois))
        print(f'\n  {key}  (avg={avg_roi:.1f}%  min={min_roi:.1f}%)')
        print(f'    {yr_str}')

    # [D] top stable x spread x odds
    print()
    print('--- [D] top stable conditions x spread x odds filter ---')
    for min_roi, avg_roi, key, sub, yr_rois in stability[:5]:
        print(f'\n  condition: {key}  (avg={avg_roi:.1f}%)')
        for sp in [3.0, 5.0, 8.0]:
            for od in [1.0, 2.0, 3.0]:
                filtered = [r for r in sub if r['spread'] >= sp and r['top1_odds'] >= od]
                show(f'    spread>={sp:.0f} odds>={od:.1f}', filtered, min_races=20)

    print()
    print('* = >=95%  ** = >=100%  *** = >=105%')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'backtest_all_enriched.csv'
    run(path)
