"""
backtest_result.csv に芝/ダート・距離・競馬場・クラスを付加して enriched.csv を作成
"""
import requests, re, csv, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Referer': 'https://race.netkeiba.com/',
})

VENUE_MAP = {
    '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
    '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉',
}

def fetch_race_meta(race_id):
    """レースの芝/ダート・距離・競馬場・クラスを取得"""
    url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
    try:
        r = SESSION.get(url, timeout=15)
        html = r.content.decode('euc-jp', errors='replace')

        # 競馬場コード (race_idの5-6桁目)
        venue_code = race_id[4:6]
        venue = VENUE_MAP.get(venue_code, venue_code)

        # 芝/ダート・距離: "芝1600m" or "ダ1200m" のパターン
        surface, distance = '', 0
        m = re.search(r'(芝|ダ[ーｰ]?ト?)[\s　]*(\d{3,4})\s*m', html)
        if m:
            surface = '芝' if m.group(1) == '芝' else 'ダート'
            distance = int(m.group(2))

        # クラス: 新馬/未勝利/1勝/2勝/3勝/オープン/G1/G2/G3
        race_class = ''
        for kw, label in [
            ('新馬', '新馬'), ('未勝利', '未勝利'),
            ('1勝クラス', '1勝'), ('2勝クラス', '2勝'), ('3勝クラス', '3勝'),
            ('オープン', 'OP'), ('GⅠ', 'G1'), ('GⅡ', 'G2'), ('GⅢ', 'G3'),
            ('G1', 'G1'), ('G2', 'G2'), ('G3', 'G3'),
        ]:
            if kw in html:
                race_class = label
                break

        # 距離帯
        if distance <= 1200:
            dist_band = '短距離(~1200)'
        elif distance <= 1600:
            dist_band = '短中距離(1201-1600)'
        elif distance <= 2000:
            dist_band = '中距離(1601-2000)'
        elif distance <= 2400:
            dist_band = '中長距離(2001-2400)'
        else:
            dist_band = '長距離(2401~)'

        return {
            'race_id':   race_id,
            'venue':     venue,
            'surface':   surface,
            'distance':  distance,
            'dist_band': dist_band,
            'race_class': race_class,
        }
    except Exception as e:
        print(f'  [WARN] {race_id}: {e}')
        return {'race_id': race_id, 'venue': '', 'surface': '', 'distance': 0, 'dist_band': '', 'race_class': ''}

def run(input_csv='backtest_result.csv', output_csv='enriched.csv'):
    # 元CSV読み込み
    rows = []
    with open(input_csv, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f'元データ: {len(rows)}行')

    # ユニークなrace_idだけメタ情報を取得
    race_ids = list(dict.fromkeys(r['race_id'] for r in rows))
    print(f'ユニークrace_id: {len(race_ids)}件 → メタ情報取得中...')

    meta = {}
    with ThreadPoolExecutor(max_workers=15) as ex:
        futures = {ex.submit(fetch_race_meta, rid): rid for rid in race_ids}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            meta[result['race_id']] = result
            done += 1
            if done % 100 == 0:
                print(f'  {done}/{len(race_ids)} 完了...')

    print(f'メタ情報取得完了')

    # 元データにメタ情報を結合して保存
    fieldnames = list(rows[0].keys()) + ['venue', 'surface', 'distance', 'dist_band', 'race_class']
    with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            m = meta.get(row['race_id'], {})
            row.update({
                'venue':      m.get('venue', ''),
                'surface':    m.get('surface', ''),
                'distance':   m.get('distance', 0),
                'dist_band':  m.get('dist_band', ''),
                'race_class': m.get('race_class', ''),
            })
            writer.writerow(row)

    print(f'{output_csv} 保存完了 ({len(rows)}行)')

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else 'backtest_result.csv'
    out = sys.argv[2] if len(sys.argv) > 2 else 'enriched.csv'
    run(inp, out)
