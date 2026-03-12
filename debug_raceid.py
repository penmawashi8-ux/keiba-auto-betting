"""
result HTMLの実際の構造を確認するデバッグスクリプト
"""
import requests, re

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

race_id = '202506010101'

# --- result HTML確認 ---
url = f'https://race.netkeiba.com/race/result.html?race_id={race_id}'
r = SESSION.get(url, timeout=15)

# EUC-JPとUTF-8両方試す
for enc in ['euc-jp', 'utf-8']:
    try:
        html = r.content.decode(enc, errors='replace')
        # 着順っぽいパターンを探す
        hits = re.findall(r'.{0,40}(?:Rank|Umaban|1着|chakujuni).{0,40}', html, re.IGNORECASE)
        if hits:
            print(f'\n=== {enc} でデコード ===')
            for h in hits[:5]:
                print(repr(h))
            break
    except:
        pass

# 払戻テーブル周辺
pay_hits = re.findall(r'.{0,30}(?:単勝|払戻|Haraimodoshi).{0,60}', html, re.IGNORECASE)
print('\n--- 払戻周辺 ---')
for h in pay_hits[:3]:
    print(repr(h))

# HTMLの先頭500文字
print('\n--- HTML先頭500文字 ---')
print(html[:500])

# --- オッズAPI確認（update vs result） ---
print('\n\n=== オッズAPIの比較 ===')
for action in ['update', 'result']:
    url2 = f'https://race.netkeiba.com/api/api_get_jra_odds.html?race_id={race_id}&type=1&action={action}'
    r2 = SESSION.get(url2, timeout=15)
    data = r2.json()
    status = data.get('status', '')
    odds_raw = data.get('data', {}).get('odds', {}).get('1', {})
    result_arr = data.get('data', {}).get('result', [])
    print(f'\naction={action}: status={status}, result={result_arr}')
    sample = list(odds_raw.items())[:3]
    for k, v in sample:
        print(f'  horse {k}: {v}')
