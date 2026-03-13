import requests, re, time, csv, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'ja-JP,ja;q=0.9',
})

def get_race_ids_for_date(yyyymmdd):
    url = f'https://race.netkeiba.com/top/race_list.html?kaisai_date={yyyymmdd}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('utf-8', errors='ignore')
        all_ids = re.findall(r'race_id=(\d{12})', html)
        race_ids = list(dict.fromkeys(
            rid for rid in all_ids if rid[:4] == yyyymmdd[:4]
        ))
        return sorted(race_ids)
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

def fetch_odds(race_id):
    url = f'https://race.netkeiba.com/api/api_get_jra_odds.html?race_id={race_id}&type=1&action=update'
    try:
        r = SESSION.get(url, timeout=15)
        data = r.json()
        status = data.get('status', '')
        odds_raw = data.get('data', {}).get('odds', {}).get('1', {})
        if not odds_raw:
            return None, f'empty({status})'
        odds = []
        for k, v in odds_raw.items():
            try:
                odds.append({
                    'horse_num': int(k),
                    'odds':      float(v[0]),
                    'popular':   int(v[2]) if len(v) > 2 else 99
                })
            except:
                pass
        odds.sort(key=lambda x: x['popular'])
        return odds, status
    except Exception as e:
        return None, str(e)

def fetch_result(race_id):
    try:
        url = f'https://race.netkeiba.com/race/result.html?race_id={race_id}'
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('euc-jp', errors='replace')
        winner = None
        # After euc-jp decode, Japanese chars appear as Unicode normally
        m = re.search(
            r'<div class="Rank">1<br[^>]*/?>.*?</div>.*?'
            r'<td class="Num Waku\d+">[^<]*<div>(\d+)</div>.*?'
            r'<td class="Num Waku\d+">[^<]*<div>(\d+)</div>',
            html, re.DOTALL
        )
        if m:
            winner = int(m.group(2))  # group(2) = horse number

        win_odds = None
        pay_m = re.search(
            r'class="Tansho".*?<td class="Payout"><span>([\d,]+)',
            html, re.DOTALL
        )
        if pay_m:
            win_odds = float(pay_m.group(1).replace(',', '')) / 100.0

        if winner:
            print(f'    result: winner={winner} win_odds={win_odds}')
            return winner, win_odds
        else:
            print(f'    [FAIL] fetch_result {race_id}: winner not found')
    except Exception as e:
        print(f'    [WARN] result {race_id}: {e}')
    return None, None

def calc_wareme(odds_arr):
    if len(odds_arr) < 4:
        return 0, 0, []
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
    if best_n == 0 or best_n >= len(odds_arr):
        spread = 0
    else:
        pick_max_odds = odds_arr[best_n - 1]['odds']
        rest = odds_arr[best_n:]
        avg_rest = sum(x['odds'] for x in rest) / len(rest)
        spread = avg_rest / pick_max_odds if pick_max_odds > 0 else 0
    pick_ratio = best_n / len(odds_arr)
    return round(spread, 3), round(pick_ratio, 3), best_bets

def run_backtest(start_date, end_date, output_csv='backtest_result.csv'):
    dates = get_weekend_dates(start_date, end_date)
    print(f'target: {len(dates)} days  {dates[0]} - {dates[-1]}')
    rows = []
    for date in dates:
        print(f'\n=== {date} ===')
        race_ids = get_race_ids_for_date(date)
        print(f'  races: {len(race_ids)}')
        if not race_ids:
            continue

        def process_race(race_id):
            odds_arr, status = fetch_odds(race_id)
            if not odds_arr or len(odds_arr) < 4:
                return None
            spread, pick_ratio, bets = calc_wareme(odds_arr)
            winner, win_odds = fetch_result(race_id)
            top1_num  = odds_arr[0]['horse_num']
            top1_odds = odds_arr[0]['odds']
            invest, payout, hit = 0, 0, False
            if bets:
                invest = sum(b[1] for b in bets)
                if winner:
                    for horse_num, bet_amt in bets:
                        if horse_num == winner:
                            hit = True
                            payout = int(win_odds * bet_amt) if win_odds else 0
                            break
            top1_hit    = (winner == top1_num) if winner else False
            top1_payout = int(win_odds * 100) if (top1_hit and win_odds) else 0
            return {
                'race_id':     race_id,
                'date':        date,
                'spread':      spread,
                'pick_ratio':  pick_ratio,
                'num_horses':  len(odds_arr),
                'num_picks':   len(bets),
                'invest':      invest,
                'payout':      payout,
                'profit':      payout - invest,
                'hit':         int(hit),
                'winner':      winner or '',
                'win_odds':    win_odds or '',
                'top1_num':    top1_num,
                'top1_odds':   top1_odds,
                'top1_hit':    int(top1_hit),
                'top1_payout': top1_payout,
            }

        with ThreadPoolExecutor(max_workers=15) as ex:
            futures = {ex.submit(process_race, rid): rid for rid in race_ids}
            date_rows = []
            for future in as_completed(futures):
                r = future.result()
                if r:
                    date_rows.append(r)
                    result_str = f'HIT +{r["payout"]-r["invest"]}' if r['hit'] else f'MISS -{r["invest"]}'
                    print(f'  {r["race_id"]}: spread={r["spread"]:.2f} ratio={r["pick_ratio"]:.0%} picks={r["num_picks"]} => {result_str}')
            rows.extend(sorted(date_rows, key=lambda x: x['race_id']))

    if rows:
        with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        print(f'\nsaved: {output_csv}')

    summary = build_summary(rows)
    print(summary)
    with open('backtest_summary.txt', 'w', encoding='utf-8') as f:
        f.write(summary)
    print('saved: backtest_summary.txt')

def build_summary(rows):
    lines = ['='*60, 'Backtest Summary', '='*60]
    if not rows:
        lines.append('no data')
        return '\n'.join(lines)
    lines.append(f'total races: {len(rows)}')
    lines.append('')
    lines.append('--- Portfolio strategy (spread threshold) ---')
    lines.append('')
    for th in [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]:
        sub = [r for r in rows if r['spread'] >= th and r['num_picks'] > 0]
        if not sub:
            continue
        si = sum(r['invest'] for r in sub)
        sp = sum(r['payout'] for r in sub)
        sh = sum(r['hit']    for r in sub)
        sr = sp / si * 100 if si > 0 else 0
        hr = sh / len(sub) * 100
        lines.append(
            f'  spread>={th:.1f}: {len(sub):3d} races  '
            f'ROI={sr:6.1f}%  hit={hr:5.1f}%  '
            f'invest={si:,}  payout={sp:,}'
        )
    lines.append('')
    lines.append('--- Top1 horse 100yen win bet (spread threshold) ---')
    lines.append('')
    for th in [1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0]:
        sub = [r for r in rows if r['spread'] >= th and 'top1_hit' in r]
        if not sub:
            continue
        si = len(sub) * 100
        sp = sum(r['top1_payout'] for r in sub)
        sh = sum(r['top1_hit'] for r in sub)
        sr = sp / si * 100 if si > 0 else 0
        hr = sh / len(sub) * 100
        marker = ' *' if sr >= 100 else ''
        lines.append(
            f'  spread>={th:4.0f}: {len(sub):4d}R  '
            f'ROI={sr:6.1f}%{marker}  hit={hr:5.1f}%  '
            f'invest={si:,}  payout={sp:,}'
        )
    lines.append('='*60)
    return '\n'.join(lines)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a.strip()]
    if len(args) >= 2:
        start, end = args[0], args[1]
    else:
        today = datetime.now(JST)
        end   = today.strftime('%Y%m%d')
        start = (today - timedelta(days=90)).strftime('%Y%m%d')
        print(f'no args -> last 3 months: {start} - {end}')
    output_csv = args[2] if len(args) >= 3 else f'backtest_{start[:4]}.csv'
    run_backtest(start, end, output_csv)
