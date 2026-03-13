import requests, re, os, sys
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
DISCORD_WEBHOOK = os.environ.get('DISCORD_WEBHOOK', '')

NOTIFY_MIN = 15
NOTIFY_MAX = 30

CONDITIONS = [
    dict(label='★★★ 阪神/ダート/1601-2000m/2勝/odds>=3.0',
         venue='阪神', surface='ダート', dist_min=1601, dist_max=2000, race_class='2勝', min_odds=3.0),
    dict(label='★★★ 福島/芝/2401m~/1勝/odds>=3.0',
         venue='福島', surface='芝', dist_min=2401, dist_max=9999, race_class='1勝', min_odds=3.0),
    dict(label='★★ 東京/芝/マイル/未勝利/odds>=3.0',
         venue='東京', surface='芝', dist_min=1201, dist_max=1600, race_class='未勝利', min_odds=3.0),
    dict(label='★★ 東京/芝/マイル/新馬/odds>=3.0',
         venue='東京', surface='芝', dist_min=1201, dist_max=1600, race_class='新馬', min_odds=3.0),
    dict(label='★ 芝/マイル/新馬/odds>=3.0(全場)',
         venue=None, surface='芝', dist_min=1201, dist_max=1600, race_class='新馬', min_odds=3.0),
    dict(label='★ 芝/超長距離/1勝/odds>=3.0(全場)',
         venue=None, surface='芝', dist_min=2401, dist_max=9999, race_class='1勝', min_odds=3.0),
]

VENUE_MAP = {
    '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
    '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉',
}

CLASS_KEYWORDS = [
    ('新馬','新馬'),('未勝利','未勝利'),
    ('1勝','1勝クラス'),('2勝','2勝クラス'),('3勝','3勝クラス'),
    ('Open','オープン'),('G3','G3'),('G2','G2'),('G1','G1'),
]

HEADERS = {'User-Agent':'Mozilla/5.0 (compatible)','Accept-Charset':'euc-jp'}

def get_today_race_ids():
    now = datetime.now(JST)
    date_str = now.strftime('%Y%m%d')
    url = f'https://race.netkeiba.com/top/race_list_sub.html?kaisai_date={date_str}'
    r = requests.get(url, headers=HEADERS, timeout=15)
    ids = re.findall(r'race_id=(\d{12})', r.text)
    return list(dict.fromkeys(ids))

def get_race_info(race_id):
    url = f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
    r = requests.get(url, headers=HEADERS, timeout=15)
    html = r.content.decode('euc-jp', errors='replace')

    venue_code = race_id[4:6]
    venue = VENUE_MAP.get(venue_code, '?')

    surface = ''
    if re.search(r'<span class="Turf">', html):
        surface = '芝'
    elif re.search(r'<span class="Dirt">', html):
        surface = 'ダート'

    dist = 0
    dm = re.search(r'<span>(\d{3,4})m</span>', html)
    if dm:
        dist = int(dm.group(1))

    race_class = ''
    for cls_key, keyword in CLASS_KEYWORDS:
        if keyword in html:
            race_class = cls_key
            break

    start_time = None
    tm = re.search(r'(\d{1,2}):(\d{2})発走', html)
    if tm:
        now = datetime.now(JST)
        h, m = int(tm.group(1)), int(tm.group(2))
        start_time = now.replace(hour=h, minute=m, second=0, microsecond=0)

    return dict(race_id=race_id, venue=venue, surface=surface,
                dist=dist, race_class=race_class, start_time=start_time)

def get_top1_odds(race_id):
    url = f'https://race.netkeiba.com/api/api_get_jra_odds.html?type=1&race_id={race_id}'
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        data = r.json()
        odds_vals = []
        for v in data.get('data', {}).get('odds', {}).values():
            if isinstance(v, list) and v:
                try:
                    odds_vals.append(float(v[0]))
                except Exception:
                    pass
        if odds_vals:
            return min(odds_vals)
    except Exception as e:
        print(f'    odds error: {e}')
    return None

def check_conditions(info, odds):
    matched = []
    for cond in CONDITIONS:
        if cond['venue'] and info['venue'] != cond['venue']:
            continue
        if info['surface'] != cond['surface']:
            continue
        if not (cond['dist_min'] <= info['dist'] <= cond['dist_max']):
            continue
        if info['race_class'] != cond['race_class']:
            continue
        if odds is None or odds < cond['min_odds']:
            continue
        matched.append(cond['label'])
    return matched

def send_discord(message):
    if not DISCORD_WEBHOOK:
        print('[Discord] WEBHOOK not set, skipping')
        return
    resp = requests.post(DISCORD_WEBHOOK, json={'content': message}, timeout=10)
    print(f'[Discord] status={resp.status_code}')

def main():
    now = datetime.now(JST)
    print(f'=== notify.py [{now.strftime("%Y-%m-%d %H:%M")} JST] ===')

    race_ids = get_today_race_ids()
    print(f'today races: {len(race_ids)}')

    for race_id in race_ids:
        try:
            info = get_race_info(race_id)
            if not info['start_time']:
                continue

            minutes_until = (info['start_time'] - now).total_seconds() / 60

            if not (NOTIFY_MIN <= minutes_until <= NOTIFY_MAX):
                continue

            label = f"{info['venue']} {info['surface']}{info['dist']}m {info['race_class']}"
            print(f'  [{race_id}] {label} 発走{info["start_time"].strftime("%H:%M")} ({minutes_until:.0f}分前)')

            odds = get_top1_odds(race_id)
            print(f'    1番人気: {odds}倍')

            matched = check_conditions(info, odds)
            if matched:
                msg  = '🎯 **条件合致レース！**\n'
                msg += '━━━━━━━━━━━━\n'
                msg += f'📍 {label}\n'
                msg += f'⏱ 発走: {info["start_time"].strftime("%H:%M")} ({minutes_until:.0f}分前)\n'
                msg += f'💴 1番人気オッズ: {odds}倍\n'
                msg += '━━━━━━━━━━━━\n'
                for m in matched:
                    msg += f'✅ {m}\n'
                msg += '━━━━━━━━━━━━\n'
                msg += '🎟 買い方: 1番人気単勝\n'
                msg += f'https://race.netkeiba.com/race/shutuba.html?race_id={race_id}'
                print(msg)
                send_discord(msg)
            else:
                print(f'    -> 条件不一致 (odds={odds})')

        except Exception as e:
            print(f'  error [{race_id}]: {e}')

    print('=== done ===')

if __name__ == '__main__':
    main()
