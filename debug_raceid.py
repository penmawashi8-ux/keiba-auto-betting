"""
netkeibaのrace_list HTMLからレースIDの形式を確認するデバッグスクリプト
"""
import requests, re

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

# 確実に開催があった日（2025年1月5日）
yyyymmdd = '20250105'
url = f'https://race.netkeiba.com/top/race_list.html?kaisai_date={yyyymmdd}'
r = SESSION.get(url, timeout=15)
html = r.content.decode('utf-8', errors='ignore')

print(f'HTTP status: {r.status_code}')
print(f'HTML length: {len(html)}')
print()

# race_idとして拾えるもの全部
all_ids = re.findall(r'race_id=(\d+)', html)
print(f'全race_id候補: {len(all_ids)}件')
for rid in list(dict.fromkeys(all_ids))[:20]:
    print(f'  {rid}  (len={len(rid)}, prefix8={rid[:8]})')

print()
# 前後のHTMLコンテキストも確認
for m in re.finditer(r'.{30}race_id=\d+.{30}', html):
    print(m.group())
    break
