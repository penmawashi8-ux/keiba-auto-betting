"""
競馬割れ目指数バックテスト (GitHub Actions対応版)
使い方:
  python3 backtest.py [開始日YYYYMMDD] [終了日YYYYMMDD]
  例: python3 backtest.py 20250101 20251231
  引数なし -> 直近3ヶ月
"""

import requests, json, re, time, csv, sys, os
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'ja-JP,ja;q=0.9',
})

# ============================================================
# 1. レースID取得
# ============================================================

def get_race_ids_for_date(yyyymmdd):
    url = f'https://race.netkeiba.com/top/race_list.html?kaisai_date={yyyymmdd}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('utf-8', errors='ignore')
        race_ids = list(dict.fromkeys(re.findall(r'race_id=(\d{12})', html)))
        return [rid for rid in race_ids if rid[:4] == yyyymmdd[:4]]
    except Exception as e:
        print(f'  [ERROR] get_race_ids {yyyymmdd}: {e}')
        return []

def get_weekend_dates(start_yyyymmdd, end_yyyymmdd):
    start = datetime.strptime(start_yyyymmdd, '%Y%m%d')
    end   = datetime.strptime(end_yyyymmdd,   '%Y%m%d')
    dates, d = [], start
    while d <= end:
        if d.weekday() in [5, 6]:
            dates.append(d.strftime('%Y%m%d'))
        d += timedelta(days=1)
    return dates

# ============================================================
# 2. オッズ取得
# ============================================================

def fetch_odds(race_id):
    url = f'https://race.netkeiba.com/api/api_get_jra_odds.html?race_id={race_id}&type=1&action=update'
    try:
        r = SESSION.get(url, timeout=15)
        data = r.json()
        status = data.get('status', '')
        if status not in ['yoso', 'result', 'ok', 'middle', 'close']:
            return None, status
        odds_raw = data.get('data', {}).get('odds', {}).get('1', {})
        if not odds_raw:
            return None, 'empty_odds'
        odds = []
        for k, v in odds_raw.items():
            try:
                odds.append({'horse_num': int(k), 'odds': float(v[0]), 'popular': int(v[2]) if len(v) > 2 else 99})
            except:
                pass
        odds.sort(key=lambda x: x['popular'])
        return odds, status
    except Exception as e:
        return None, str(e)

# ============================================================
# 3. 結果取得
# ============================================================

def fetch_result(race_id):
    """1着馬番と確定単勝払戻オッズを返す"""
    # result APIを試す
    try:
        url = f'https://race.netkeiba.com/api/api_get_jra_odds.html?race_id={race_id}&type=1&action=result'
        r = SESSION.get(url, timeout=15)
        data = r.json()
        result_arr = data.get('data', {}).get('result', [])
        if result_arr:
            winner = int(result_arr[0])
            odds_raw = data.get('data', {}).get('odds', {}).get('1', {})
            win_odds = None
            if str(winner) in odds_raw:
                try:
                    win_odds = float(odds_raw[str(winner)][0])
                except:
                    pass
            return winner, win_odds
    except:
        pass

    # HTMLフォールバック
    try:
        url = f'https://race.netkeiba.com/race/result.html?race_id={race_id}'
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('utf-8', errors='ignore')
        match = re.search(r'<td class="Rank">1</td>.*?<td[^>]*>\s*(\d+)\s*</td>', html, re.DOTALL)
        winner = int(match.group(1)) if match else None
        match2 = re.search(r'単勝.*?(\d[\d,]+)\s*円', html, re.DOTALL)
        win_odds = float(match2.group(1).replace(',', '')) / 100.0 if match2 else None
        return winner, win_odds
    except Exception as e:
        print(f'  [WARN] fetch_result {race_id}: {e}')
        return None, None

# ============================================================
# 4. 割れ目指数 & ポートフォリオ
# ============================================================

def calc_wareme(odds_arr):
    """
    割れ目指数 = (下位馬の平均オッズ) / (上位3頭の平均オッズ)
    ポートフォリオ = 全員的中時に利益が出る最大N頭
    """
    if len(odds_arr) < 4:
        return 0, 0, []

    top3 = odds_arr[:3]
    rest = odds_arr[3:]
    avg_top  = sum(x['odds'] for x in top3) / 3
    avg_rest = sum(x['odds'] for x in rest) / len(rest)
    spread = avg_rest / avg_top if avg_top > 0 else 0

    best_n, best_bets = 0, []
    for n in range(len(odds_arr), 0, -1):
        top = odds_arr[:n]
        inv = [1 / o['odds'] for o in top]
        s = sum(inv)
        if s == 0:
            continue
        bets = [max(100, round(inv[i] / s * 1000 / 100) * 100) for i in range(n)]
        if min(round(bets[i] * top[i]['odds']) for i in range(n)) > sum(bets):
            best_n = n
            best_bets = [(top[i]['horse_num'], bets[i]) for i in range(n)]
            break

    pick_ratio = best_n / len(odds_arr)
    return spread, pick_ratio, best_bets

def should_bet(spread, pick_ratio):
    return spread >= 2.0 and (pick_ratio >= 0.4 or spread >= 3.0)

# ============================================================
# 5. バックテスト実行
# ============================================================

def run_backtest(start_date, end_date):
    dates = get_weekend_dates(start_date, end_date)
    print(f'対象週末: {len(dates)}日  {dates[0]} - {dates[-1]}')

    rows = []

    for date in dates:
        print(f'\n=== {date} ===')
        race_ids = get_race_ids_for_date(date)
        print(f'  レース数: {len(race_ids)}')
        time.sleep(1)

        for race_id in race_ids:
            time.sleep(0.8)

            odds_arr, status = fetch_odds(race_id)
            if not odds_arr or len(odds_arr) < 4:
                print(f'  {race_id}: skip ({status})')
                continue

            spread, pick_ratio, bets = calc_wareme(odds_arr)
            bet_flag = should_bet(spread, pick_ratio)

            winner, win_odds = fetch_result(race_id)
            time.sleep(0.5)

            invest, payout, hit = 0, 0, False
            if bet_flag and bets:
                invest = sum(b[1] for b in bets)
                if winner:
                    for horse_num, bet_amt in bets:
                        if horse_num == winner:
                            hit = True
                            payout = int(win_odds * bet_amt) if win_odds else 0
                            break

            rows.append({
                'race_id':    race_id,
                'date':       date,
                'spread':     round(spread, 3),
                'pick_ratio': round(pick_ratio, 3),
                'bet_flag':   int(bet_flag),
                'num_horses': len(odds_arr),
                'num_picks':  len(bets),
                'invest':     invest,
                'payout':     payout,
                'profit':     payout - invest if bet_flag else 0,
                'hit':        int(hit) if bet_flag else 0,
                'winner':     winner or '',
                'win_odds':   win_odds or '',
            })

            if bet_flag:
                hit_str = f' → HIT +{payout-invest}円' if hit else f' → MISS -{invest}円'
                print(f'  {race_id}: spread={spread:.2f} ratio={pick_ratio:.0%}{hit_str}')
            else:
                print(f'  {race_id}: spread={spread:.2f} (skip)')

    # CSV保存
    if rows:
        with open('backtest_result.csv', 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        print('\nbacktest_result.csv 保存完了')

    summary = build_summary(rows)
    print(summary)
    with open('backtest_summary.txt', 'w', encoding='utf-8') as f:
        f.write(summary)
    print('backtest_summary.txt 保存完了')

def build_summary(rows):
    lines = ['='*60, 'バックテスト結果サマリー', '='*60]
    if not rows:
        lines.append('データなし')
        return '\n'.join(lines)

    bet_rows = [r for r in rows if r['bet_flag']]
    lines.append(f'総レース数:     {len(rows)}')
    lines.append(f'購入対象レース: {len(bet_rows)} ({len(bet_rows)/len(rows)*100:.1f}%)\n')

    if not bet_rows:
        lines.append('購入対象なし')
        return '\n'.join(lines)

    inv   = sum(r['invest'] for r in bet_rows)
    pay   = sum(r['payout'] for r in bet_rows)
    hits  = sum(r['hit']    for r in bet_rows)
    roi   = pay / inv * 100 if inv > 0 else 0
    hrate = hits / len(bet_rows) * 100

    lines += [
        f'総投資額:  {inv:,}円',
        f'総払戻額:  {pay:,}円',
        f'損益:      {pay-inv:+,}円',
        f'回収率:    {roi:.1f}%',
        f'的中率:    {hrate:.1f}% ({hits}/{len(bet_rows)})',
        '',
        '--- spread閾値別 回収率 ---',
    ]

    for th in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]:
        sub = [r for r in rows if r['spread'] >= th]
        if not sub:
            continue
        si = sum(r['invest'] for r in sub)
        sp = sum(r['payout'] for r in sub)
        sh = sum(r['hit']    for r in sub)
        sr = sp / si * 100 if si > 0 else 0
        hr = sh / len(sub) * 100
        lines.append(f'  spread>={th:.1f}: {len(sub):3d}レース  回収率={sr:6.1f}%  的中率={hr:5.1f}%  投資={si:,}円')

    lines.append('='*60)
    return '\n'.join(lines)

# ============================================================
# エントリポイント
# ============================================================

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a.strip()]
    if len(args) >= 2:
        start, end = args[0], args[1]
    else:
        today = datetime.now(JST)
        end   = today.strftime('%Y%m%d')
        start = (today - timedelta(days=90)).strftime('%Y%m%d')
        print(f'引数なし -> 直近3ヶ月: {start} - {end}')

    run_backtest(start, end)
