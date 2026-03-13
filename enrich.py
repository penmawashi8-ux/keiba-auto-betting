import requests, re, csv, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', 'Referer': 'https://race.netkeiba.com/'})

VENUE_MAP = {'01':'æ­å¹','02':'å½é¤¨','03':'ç¦å³¶','04':'æ°æ½','05':'æ±äº¬','06':'ä¸­å±±','07':'ä¸­äº¬','08':'äº¬é½','09':'éªç¥','10':'å°å'}

def fetch_race_meta(race_id):
    url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('euc-jp', errors='replace')
        venue = VENUE_MAP.get(race_id[4:6], race_id[4:6])
        surface = ''
        m = re.search(r'class="(Dirt|Turf)">', html)
        if m:
            surface = 'ãã¼ã' if m.group(1) == 'Dirt' else 'è'
        distance = 0
        m2 = re.search(r'<span>(\d{3,4})m</span>', html)
        if m2:
            distance = int(m2.group(1))
        race_class = ''
        for kw, label in [('æ°é¦¬','æ°é¦¬'),('æªåå©','æªåå©'),('1åã¯ã©ã¹','1å'),('2åã¯ã©ã¹','2å'),('3åã¯ã©ã¹','3å'),('ãªã¼ãã³','OP'),('GI','G1'),('GII','G2'),('GIII','G3'),('Gâ ','G1'),('Gâ¡','G2'),('Gâ¢','G3')]:
            if kw in html:
                race_class = label
                break
        m3 = re.search(r'description[^>]+content="([^"]+)"', html)
        desc = m3.group(1) if m3 else ''
        for v in VENUE_MAP.values():
            if v in desc:
                venue = v
                break
        if distance <= 1200:
            dist_band = 'ç­è·é¢(~1200)'
        elif distance <= 1600:
            dist_band = 'ç­ä¸­è·é¢(1201-1600)'
        elif distance <= 2000:
            dist_band = 'ä¸­è·é¢(1601-2000)'
        elif distance <= 2400:
            dist_band = 'ä¸­é·è·é¢(2001-2400)'
        else:
            dist_band = 'é·è·é¢(2401~)'
        return {'race_id':race_id,'venue':venue,'surface':surface,'distance':distance,'dist_band':dist_band,'race_class':race_class}
    except Exception as e:
        print(f'  [WARN] {race_id}: {e}')
        return {'race_id':race_id,'venue':'','surface':'','distance':0,'dist_band':'','race_class':''}

def run(input_csv='backtest_result.csv', output_csv='enriched.csv'):
    rows = []
    with open(input_csv, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f'åãã¼ã¿: {len(rows)}è¡')
    race_ids = list(dict.fromkeys(r['race_id'] for r in rows))
    print(f'ã¦ãã¼ã¯race_id: {len(race_ids)}ä»¶')
    meta = {}
    with ThreadPoolExecutor(max_workers=15) as ex:
        futures = {ex.submit(fetch_race_meta, rid): rid for rid in race_ids}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            meta[result['race_id']] = result
            done += 1
            if done % 200 == 0:
                print(f'  {done}/{len(race_ids)} å®äº...')
    print(f'ã¡ã¿æå ±åå¾å®äº')
    fieldnames = list(rows[0].keys()) + ['venue','surface','distance','dist_band','race_class']
    with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            m = meta.get(row['race_id'], {})
            row.update({'venue':m.get('venue',''),'surface':m.get('surface',''),'distance':m.get('distance',0),'dist_band':m.get('dist_band',''),'race_class':m.get('race_class','')})
            writer.writerow(row)
    print(f'{output_csv} ä¿å­å®äº ({len(rows)}è¡)')

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'backtest_result.csv'
    out = sys.argv[2] if len(sys.argv) > 2 else 'enriched.csv'
    run(inp, out)
