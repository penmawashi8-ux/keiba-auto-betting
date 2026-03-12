"""
result HTMLの着順・払戻テーブル構造を詳しく確認
"""
import requests, re

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

race_id = '202506010101'
url = f'https://race.netkeiba.com/race/result.html?race_id={race_id}'
r = SESSION.get(url, timeout=15)
html = r.content.decode('euc-jp', errors='replace')

# Rank divの前後200文字を表示
for m in re.finditer(r'<div class="Rank">1<br', html):
    start = max(0, m.start() - 50)
    end   = min(len(html), m.end() + 300)
    print('=== Rank=1 周辺のHTML ===')
    print(html[start:end])
    print()
    break

# 払戻テーブル周辺
for m in re.finditer(r'単勝', html):
    start = max(0, m.start() - 20)
    end   = min(len(html), m.end() + 200)
    print('=== 単勝払戻周辺のHTML ===')
    print(html[start:end])
    print()
    break
