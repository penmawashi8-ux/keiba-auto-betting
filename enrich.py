# -*- coding: utf-8 -*-
import requests, re, csv, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', 'Referer': 'https://race.netkeiba.com/'})

VENUE_MAP = {'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'}

def fetch_race_meta(race_id):
    url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('euc-jp', errors='replace')
        venue = VENUE_MAP.get(race_id[4:6], race_id[4:6])
        surface = ''
        m = re.search(r'class="(Dirt|Turf)">', html)
        if m:
            surface = 'ダート' if m.group(1) == 'Dirt' else '芝'
        distance = 0
        m2 = re.search(r'<span>(\d{3,4})m</span>', html)
        if m2:
            distance = int(m2.group(1))
        race_class = 'OP'
        m3 = re.search(r'class="Race_Name"[^>]*>(.*?)</', html, re.DOTALL)
        if m3:
            name = m3.group(1).strip()
            if '新馬' in name: race_class = '新馬'
            elif '未勝利' in name: race_class = '未勝利'
            elif '1勝' in name: race_class = '1勝'
            elif '2勝' in name: race_class = '2勝'
            elif '3勝' in name: race_class = '3勝'
            elif 'GⅠ' in name or 'GI' in name: race_class = 'G1'
            elif 'GⅡ' in name or 'GII' in name: race_class = 'G2'
            elif 'GⅢ' in name or 'GIII' in name: race_class = 'G3'
        if distance <= 1200: dist_band = '短距離(~1200)'
        elif distance <= 1600: dist_band = '短中距離(1201-1600)'
        elif distance <= 2000: dist_band = '中距離(1601-2000)'
        elif distance <= 2400: dist_band = '中長距離(2001-2400)'
        else: dist_band = '長距離(2401~)'
        return {'race_id':race_id,'venue':venue,'surface':surface,'distance':distance,'dist_band':dist_band,'race_class':race_class}
    except Exception as e:
        print(f'  [WARN] {race_id}: {e}')
        return {'race_id':race_id,'venue':'','surface':'','distance':0,'dist_band':'','race_class':''}

def run(input_csv='backtest_result.csv', output_csv='enriched.csv'):
    rows = []
    with open(input_csv, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f'元データ: {len(rows)}行')
    race_ids = list(dict.fromkeys(r['race_id'] for r in rows))
    print(f'ユニーrace_id: {len(race_ids)}件')
    meta = {}
    with ThreadPoolExecutor(max_workers=15) as ex:
        futures = {ex.submit(fetch_race_meta, rid): rid for rid in race_ids}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            meta[result['race_id']] = result
            done += 1
            if done % 200 == 0:
                print(f'  {done}/{len(race_ids)} 完了...')
    fieldnames = list(rows[0].keys()) + ['venue','surface','distance','dist_band','race_class']
    with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            m = meta.get(row['race_id'], {})
            row.update({'venue':m.get('venue',''),'surface':m.get('surface',''),'distance':m.get('distance',0),'dist_band':m.get('dist_band',''),'race_class':m.get('race_class','')})
            writer.writerow(row)
    print(f'{output_csv} 保存完了 ({len(rows)}行)')

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'backtest_result.csv'
    out = sys.argv[2] if len(sys.argv) > 2 else 'enriched.csv'
    run(inp, out)
