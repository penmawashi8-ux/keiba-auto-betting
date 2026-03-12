"""
backtest_result.csv を読み込んで複数戦略を比較分析する
再スクレイピング不要・高速
"""
import csv, sys
from collections import defaultdict

def load_csv(path='backtest_result.csv'):
    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            rows.append({
                'race_id':    r['race_id'],
                'date':       r['date'],
                'spread':     float(r['spread']),
                'pick_ratio': float(r['pick_ratio']),
                'num_horses': int(r['num_horses']),
                'num_picks':  int(r['num_picks']),
                'invest':     int(r['invest']),
                'payout':     int(r['payout']),
                'hit':        int(r['hit']),
                'winner':     r['winner'],
                'win_odds':   float(r['win_odds']) if r['win_odds'] else None,
            })
    return rows

def roi(invest_total, payout_total):
    return payout_total / invest_total * 100 if invest_total > 0 else 0

def analyze(label, rows, bet_amount=100):
    """投資・払戻・回収率・的中率を表示"""
    invest = sum(r['_invest'] for r in rows)
    payout = sum(r['_payout'] for r in rows)
    hits   = sum(1 for r in rows if r['_hit'])
    n      = len(rows)
    r_pct  = roi(invest, payout)
    h_pct  = hits / n * 100 if n > 0 else 0
    profit = payout - invest
    marker = ' ★' if r_pct >= 100 else ''
    print(f'  {label:<40} {n:4d}R  回収率={r_pct:6.1f}%{marker}  的中率={h_pct:5.1f}%  損益={profit:+,}円')

def run(path='backtest_result.csv'):
    rows = load_csv(path)
    print(f'総レース数: {len(rows)}\n')

    # ============================================================
    # 戦略A: 現行（ポートフォリオ全頭買い）= 元のinvest/payout
    # ============================================================
    print('='*70)
    print('【戦略A】現行: ポートフォリオ全頭に均等配分')
    print('='*70)
    for th in [1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0]:
        sub = [dict(r, _invest=r['invest'], _payout=r['payout'], _hit=r['hit'])
               for r in rows if r['spread'] >= th and r['num_picks'] > 0]
        if sub:
            analyze(f'spread>={th:.0f}', sub)

    # ============================================================
    # 戦略B: 1番人気1頭だけ 100円 (spread閾値別)
    # ============================================================
    print()
    print('='*70)
    print('【戦略B】1番人気1頭だけ 100円')
    print('='*70)
    # 1番人気が的中 = winner が portfolio の1番目の馬
    # ※ num_picks>=1 のレースでは「1番人気」はportfolio[0]
    # hitデータがあるが、1番人気単体hitかどうかは winner==top1 で判断する必要がある
    # 今のCSVには top1_num がないので win_odds で代用:
    # hit=1 かつ num_picks>=1 のとき、1番人気が勝った = win_odds <= (portfolio内最低オッズ想定)
    # 近似: hit=1 なら1番人気が勝ったと仮定（pick内の誰かが勝った）
    # より正確には: 「pick内で最もオッズが低い馬」= 1番人気 → 100円だけ買う
    # ここでは hit=1 = pick内的中 として、payout = win_odds * 100 で計算
    for th in [1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0]:
        sub = []
        for r in rows:
            if r['spread'] < th or r['num_picks'] < 1:
                continue
            hit = r['hit']
            payout = int(r['win_odds'] * 100) if (hit and r['win_odds']) else 0
            sub.append(dict(r, _invest=100, _payout=payout, _hit=hit))
        if sub:
            analyze(f'spread>={th:.0f}', sub)

    # ============================================================
    # 戦略C: num_picks=1（完全なる本命1頭）のみ
    # ============================================================
    print()
    print('='*70)
    print('【戦略C】ポートフォリオが1頭のレースのみ 100円')
    print('='*70)
    for th in [1.0, 2.0, 3.0, 5.0, 8.0, 10.0]:
        sub = []
        for r in rows:
            if r['spread'] < th or r['num_picks'] != 1:
                continue
            payout = int(r['win_odds'] * 100) if (r['hit'] and r['win_odds']) else 0
            sub.append(dict(r, _invest=100, _payout=payout, _hit=r['hit']))
        if sub:
            analyze(f'spread>={th:.0f}, picks=1', sub)

    # ============================================================
    # 戦略D: spreadが高いレースで「逆張り」= 穴馬狙い
    # portfolioに入らなかった馬の中で最低オッズ（最上位の穴馬）を100円
    # ※ hitデータが「portfolio内的中」なので、穴馬的中は hit=0 かつ winner存在
    # ============================================================
    print()
    print('='*70)
    print('【戦略D】穴馬狙い: portfolio外の最上位馬 100円')
    print('  ※ hit=0 かつ winner存在 = 穴馬が勝った')
    print('='*70)
    for th in [3.0, 5.0, 8.0, 10.0, 15.0, 20.0]:
        sub = []
        for r in rows:
            if r['spread'] < th or r['num_picks'] < 1 or not r['winner']:
                continue
            # portfolio外が勝った = hit=0
            穴的中 = (r['hit'] == 0)
            payout = int(r['win_odds'] * 100) if (穴的中 and r['win_odds']) else 0
            sub.append(dict(r, _invest=100, _payout=payout, _hit=穴的中))
        if sub:
            analyze(f'spread>={th:.0f}', sub)

    # ============================================================
    # 戦略E: pick_ratio別 (ポートフォリオの絞り込み度)
    # ============================================================
    print()
    print('='*70)
    print('【戦略E】pick_ratio別（全頭買い、spread>=3.0）')
    print('  pick_ratio低い = 少頭数に絞り込み = より自信あり')
    print('='*70)
    for max_ratio in [0.15, 0.20, 0.25, 0.30]:
        sub = [dict(r, _invest=r['invest'], _payout=r['payout'], _hit=r['hit'])
               for r in rows if r['spread'] >= 3.0 and r['num_picks'] > 0
               and r['pick_ratio'] <= max_ratio]
        if sub:
            analyze(f'spread>=3, ratio<={max_ratio:.0%}', sub)

    # ============================================================
    # 月別・競馬場別の傾向
    # ============================================================
    print()
    print('='*70)
    print('【参考】月別 回収率 (全レース, 戦略B: 1番人気100円)')
    print('='*70)
    by_month = defaultdict(list)
    for r in rows:
        if r['num_picks'] < 1:
            continue
        month = r['date'][:6]
        payout = int(r['win_odds'] * 100) if (r['hit'] and r['win_odds']) else 0
        by_month[month].append(dict(r, _invest=100, _payout=payout, _hit=r['hit']))
    for month in sorted(by_month):
        sub = by_month[month]
        analyze(month, sub)

    print()
    print('★ が付いた戦略が回収率100%超え')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'backtest_result.csv'
    run(path)
