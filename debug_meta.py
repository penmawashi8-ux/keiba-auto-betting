import requests, re

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', 'Referer': 'https://race.netkeiba.com/'})

race_id = '202506010101'
url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
r = SESSION.get(url, timeout=15)
html = r.content.decode('euc-jp', errors='replace')

m = re.search(r'class="Race_Data"[^>]*>(.*?)</', html, re.DOTALL)
if m:
    print("Race_Data:", m.group(1)[:300])

m2 = re.search(r'description[^>]+content="([^"]+)"', html)
if m2:
    print("desc:", m2.group(1))
