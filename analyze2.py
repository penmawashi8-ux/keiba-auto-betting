"""
enriched.csv を使って条件別（芝/ダート・距離・競馬場・クラス）の
1番人気単勝 回収率を分析する
"""
import csv, sys
from collections import defaultdict

def load(path='enriched.csv'):
    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            rows.append({
                'race_id':    r['race_id'],
                'date':       r['date'],
                'spread':     float(r['spread']),
                'num_picks':  int(r['num_picks']),
                'top1_hit':   int(r.get('top1_hit', 0)),
                'top1_payout':int(r.get('top1_payout', 0)),
                'top1_odds':  float(r.get('top1_odds', 0)),
                'win_odds':   float(r['win_odds']) if r['win_odds'] else 0,
                'venue':      r.get('venue', ''),
                'surface':    r.get('surface', ''),
                'distance':   int(r.get('distance', 0)),
                'dist_band':  r.get('dist_band', ''),
                'race_class': r.get('race_class', ''),
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
    marker = ' ★★★' if roi >= 105 else (' ★★' if roi >= 100 else (' ★' if roi >= 95 else ''))
    print(f'  {label:<45} {len(rows):4d}R  回収率={roi:6.1f}%{marker}  的中率={hrate:5.1f}%  損益={profit:+,}円')

def run(path='enriched.csv'):
    rows = load(path)
    valid = [r for r in rows if r['surface']]  # メタ情報あるもののみ
    print(f'総レース数: {len(rows)} (メタ情報あり: {len(valid)})\n')

    # ============================================================
    # 1. 芝 vs ダート
    # ============================================================
    print('='*70)
    print('【1】芝 vs ダート (1番人気100円)')
    print('='*70)
    for surf in ['芝', 'ダート']:
        sub = [r for r in valid if r['surface'] == surf]
        show(surf, sub, min_races=1)

    # ============================================================
    # 2. 距離帯別
    # ============================================================
    print()
    print('='*70)
    print('【2】距離帯別 (1番人気100円)')
    print('='*70)
    bands = ['短距離(~1200)', '短中距離(1201-1600)', '中距離(1601-2000)', '中長距離(2001-2400)', '長距離(2401~)']
    for band in bands:
        for surf in ['芝', 'ダート', '']:
            sub = [r for r in valid if r['dist_band'] == band and (surf == '' or r['surface'] == surf)]
            label = f'{band} {surf}' if surf else band
            show(label, sub)

    # ============================================================
    # 3. クラス別
    # ============================================================
    print()
    print('='*70)
    print('【3】クラス別 (1番人気100円)')
    print('='*70)
    for cls in ['新馬', '未勝利', '1勝', '2勝', '3勝', 'OP', 'G3', 'G2', 'G1']:
        sub = [r for r in valid if r['race_class'] == cls]
        show(cls, sub, min_races=10)

    # ============================================================
    # 4. 競馬場別
    # ============================================================
    print()
    print('='*70)
    print('【4】競馬場別 (1番人気100円)')
    print('='*70)
    venues = sorted(set(r['venue'] for r in valid if r['venue']))
    for v in venues:
        sub = [r for r in valid if r['venue'] == v]
        show(v, sub, min_races=1)

    # ============================================================
    # 5. 組み合わせ: 芝×距離帯×クラス (有望条件を探す)
    # ============================================================
    print()
    print('='*70)
    print('【5】組み合わせ条件 (30レース以上・回収率順)')
    print('='*70)
    combos = defaultdict(list)
    for r in valid:
        key = f"{r['surface']} / {r['dist_band']} / {r['race_class'] or '不明'}"
        combos[key].append(r)

    # 回収率順にソートして表示
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

    # ============================================================
    # 6. spread×条件の組み合わせ (上位条件をspreadでさらに絞る)
    # ============================================================
    print()
    print('='*70)
    print('【6】有望条件 × spread閾値 (20レース以上)')
    print('='*70)
    # 上位5条件を取り出してspread別に見る
    top_combos = [(roi, key, sub) for roi, key, sub in sorted(results, reverse=True)[:5]]
    for _, key, sub in top_combos:
        print(f'\n  条件: {key}')
        for th in [3.0, 5.0, 8.0, 10.0]:
            filtered = [r for r in sub if r['spread'] >= th]
            show(f'    spread>={th:.0f}', filtered, min_races=20)

    print()
    print('★=95%超  ★★=100%超  ★★★=105%超')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'enriched.csv'
    run(path)
