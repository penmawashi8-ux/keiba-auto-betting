import requests, re

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', 'Referer': 'https://race.netkeiba.com/'})

race_id = '202506010101'
url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
r = SESSION.get(url, timeout=15)
html = r.content.decode('euc-jp', errors='replace')

m = re.search(r'class="Race_Name"[^>]*>(.*?)</', html, re.DOTALL)
if m:
    print("Race_Name:", repr(m.group(1)[:200]))

m2 = re.search(r'class="Race_Data"[^>]*>(.*?)</div>', html, re.DOTALL)
if m2:
    print("Race_Data:", repr(m2.group(1)[:300]))
