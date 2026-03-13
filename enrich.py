import requests, re, csv, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

VENUE_MAP = {
    '01': '\u672d\u5e4c', '02': '\u51fd\u9928', '03': '\u798f\u5cf6', '04': '\u65b0\u6f5f', '05': '\u6771\u4eac',
    '06': '\u4e2d\u5c71', '07': '\u4e2d\u4eac', '08': '\u4eac\u90fd', '09': '\u9623\u795e', '10': '\u5c0f\u5009',
}

def fetch_race_meta(race_id):
    url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('euc-jp', errors='replace')

        venue_code = race_id[4:6]
        venue = VENUE_MAP.get(venue_code, venue_code)

        # surface: <span class="Dirt"> or <span class="Turf">
        surface = ''
        sm = re.search(r'<span class="(Dirt|Turf)">', html)
        if sm:
            surface = '\u82dd' if sm.group(1) == 'Turf' else '\u30c0\u30fc\u30c8'

        # distance: <span>1200m</span>
        distance = 0
        dm = re.search(r'<span>(\d{3,4})m</span>', html)
        if dm:
            distance = int(dm.group(1))

        # class: <h1 class="Race_Name">...</h1>
        race_class = ''
        for kw, label in [
            ('\u65b0\u99ac', '\u65b0\u99ac'),
            ('\u672a\u52dd\u5229', '\u672a\u52dd\u5229'),
            ('1\u52dd\u30af\u30e9\u30b9', '1\u52dd'),
            ('2\u52dd\u30af\u30e9\u30b9', '2\u52dd'),
            ('3\u52dd\u30af\u30e9\u30b9', '3\u52dd'),
            ('\u30aa\u30fc\u30d7\u30f3', 'OP'),
            ('G\u2160', 'G1'), ('G\u2161', 'G2'), ('G\u2162', 'G3'),
            ('G1', 'G1'), ('G2', 'G2'), ('G3', 'G3'),
        ]:
            if kw in html:
                race_class = label
                break

        if distance <= 1200:
            dist_band = 'sprint(~1200)'
        elif distance <= 1600:
            dist_band = 'mile(1201-1600)'
        elif distance <= 2000:
            dist_band = 'middle(1601-2000)'
        elif distance <= 2400:
            dist_band = 'long(2001-2400)'
        else:
            dist_band = 'ultralong(2401~)'

        return {
            'race_id':    race_id,
            'venue':      venue,
            'surface':    surface,
            'distance':   distance,
            'dist_band':  dist_band,
            'race_class': race_class,
        }
    except Exception as e:
        print(f'  [WARN] {race_id}: {e}')
        return {'race_id': race_id, 'venue': '', 'surface': '', 'distance': 0, 'dist_band': '', 'race_class': ''}

def run(input_csv, output_csv):
    rows = []
    with open(input_csv, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f'input: {len(rows)} rows')

    race_ids = list(dict.fromkeys(r['race_id'] for r in rows))
    print(f'unique race_ids: {len(race_ids)} -> fetching meta...')

    meta = {}
    with ThreadPoolExecutor(max_workers=15) as ex:
        futures = {ex.submit(fetch_race_meta, rid): rid for rid in race_ids}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            meta[result['race_id']] = result
            done += 1
            if done % 100 == 0:
                print(f'  {done}/{len(race_ids)} done...')

    print('meta fetch complete')

    fieldnames = list(rows[0].keys()) + ['venue', 'surface', 'distance', 'dist_band', 'race_class']
    # remove old meta columns if already present
    existing = list(rows[0].keys())
    if 'surface' in existing:
        fieldnames = existing
    with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            m = meta.get(row['race_id'], {})
            row['venue']      = m.get('venue', '')
            row['surface']    = m.get('surface', '')
            row['distance']   = m.get('distance', 0)
            row['dist_band']  = m.get('dist_band', '')
            row['race_class'] = m.get('race_class', '')
            writer.writerow(row)

    print(f'saved: {output_csv} ({len(rows)} rows)')

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'backtest_result.csv'
    out = sys.argv[2] if len(sys.argv) > 2 else inp.replace('.csv', '_enriched.csv')
    run(inp, out)
