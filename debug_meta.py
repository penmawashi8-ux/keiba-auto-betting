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

print('=== è·é¢ã£ã½ãæ°å­ã®å¨è¾º ===')
for m in re.finditer(r'\\d{3,4}m', html):
    start = max(0, m.start()-80)
    end = min(len(html), m.end()+40)
    print(html[start:end].replace('\n',''))

print('\n=== RaceDataç³»ã¯ã©ã¹å ===')
for m in re.finditer(r'class="[^"]*[Rr]ace[^"]*"', html):
    print(m.group())
    if m.start() > 50000:
        break

print('\n=== metaã¿ã° description ===')
m = re.search(r'<meta[^>]+description[^>]+content="([^"]+)"', html)
if m:
    print(m.group(1))
