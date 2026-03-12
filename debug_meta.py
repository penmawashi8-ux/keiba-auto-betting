import requests, re

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

race_id = '202506010101'
url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
r = SESSION.get(url, timeout=15)
html = r.content.decode('euc-jp', errors='replace')

print(f'HTTP: {r.status_code}, len={len(html)}')

# 芝/ダート/距離っぽいキーワード周辺を全部表示
for kw in ['芝', 'ダート', 'ダ', '1600', '距離', 'RaceData', 'race_type']:
    for m in re.finditer(kw, html):
        start = max(0, m.start()-30)
        end   = min(len(html), m.end()+60)
        print(f'[{kw}] ...{html[start:end]}...')
        break  # 最初の1件だけ

# クラス判定キーワード
for kw in ['新馬', '未勝利', '1勝', 'オープン', 'GⅠ', 'G1']:
    if kw in html:
        idx = html.index(kw)
        print(f'[class:{kw}] ...{html[max(0,idx-20):idx+50]}...')
        break
