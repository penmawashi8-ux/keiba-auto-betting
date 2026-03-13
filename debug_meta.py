import requests, re, csv

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', 'Referer': 'https://race.netkeiba.com/'})

# enriched.csvã®æåã®5ä»¶ãç¢ºèª
with open('enriched.csv', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))
for r in rows[:5]:
    print(r['race_id'], r['surface'], r['distance'], r['dist_band'], r['race_class'])
