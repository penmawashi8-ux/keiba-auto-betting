import requests, re, os, json
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
DISCORD_WEBHOOK = os.environ.get('DISCORD_WEBHOOK', '')
GH_TOKEN = os.environ.get('GH_TOKEN', '')
GH_REPO = 'penmawashi8-ux/keiba-auto-betting'

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
    if re.search(r'<span class="Turf">', html): surface = '芝'
    elif re.search(r'<span class="Dirt">', html): surface = 'ダート'
    dist = 0
    dm = re.search(r'(\d{3,4})m', html)
    if dm: dist = int(dm.group(1))
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

def get_top1_odds_and_horse(race_id):
    url = f'https://race.netkeiba.com/api/api_get_jra_odds.html?type=1&race_id={race_id}'
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.encoding = 'euc-jp'
        text = r.text
        import re as _re
        pairs = _re.findall(r'"(\d+)":\["([\d.]+)"', text)
        odds_map = {}
        for horse_num, odds_val in pairs:
            try: odds_map[horse_num] = float(odds_val)
            except: pass
        if odds_map:
            top1_num = min(odds_map, key=odds_map.get)
            return odds_map[top1_num], int(top1_num)
    except Exception as e:
        print(f'    odds error: {e}')
    return None, None

def check_conditions(info, odds):
    matched = []
    for cond in CONDITIONS:
        if cond['venue'] and info['venue'] != cond['venue']: continue
        if info['surface'] != cond['surface']: continue
        if not (cond['dist_min'] <= info['dist'] <= cond['dist_max']): continue
        if info['race_class'] != cond['race_class']: continue
        if odds is None or odds < cond['min_odds']: continue
        matched.append(cond['label'])
    return matched

def push_bet_target(payload):
    api = f'https://api.github.com/repos/{GH_REPO}/contents/bet_target.json'
    headers = {
        'Authorization': f'token {GH_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    sha = None
    try:
        r = requests.get(api, headers=headers, timeout=10)
        sha = r.json().get('sha')
    except: pass
    content = base64.b64encode(json.dumps(payload, ensure_ascii=False, indent=2).encode()).decode()
    body = {'message': f'bet_target: {payload["race_id"]}', 'content': content}
    if sha: body['sha'] = sha
    r = requests.put(api, headers=headers, json=body, timeout=10)
    print(f'[GitHub] push bet_target.json: {r.status_code}')

def send_discord(message):
    if not DISCORD_WEBHOOK:
        print('[Discord] WEBHOOK not set')
        return
    resp = requests.post(DISCORD_WEBHOOK, json={'content': message}, timeout=10)
    print(f'[Discord] status={resp.status_code}')

import base64

def main():
    now = datetime.now(JST)
    print(f'=== notify.py [{now.strftime("%Y-%m-%d %H:%M")} JST] ===')
    race_ids = get_today_race_ids()
    print(f'today races: {len(race_ids)}')

    for race_id in race_ids:
        try:
            info = get_race_info(race_id)
            if not info['start_time']: continue

            minutes_until = (info['start_time'] - now).total_seconds() / 60
            if not (NOTIFY_MIN <= minutes_until <= NOTIFY_MAX): continue

            label = f"{info['venue']} {info['surface']}{info['dist']}m {info['race_class']}"
            print(f'  [{race_id}] {label} 発走{info["start_time"].strftime("%H:%M")} ({minutes_until:.0f}分前)')

            odds, horse_num = get_top1_odds_and_horse(race_id)
            print(f'    1番人気: {horse_num}番 {odds}倍')

            matched = check_conditions(info, odds)
            if not matched:
                print(f'    -> 条件不一致')
                continue

            # bet_target.json をGitHubにpush
            payload = {
                'race_id': race_id,
                'race_num': int(race_id[10:12]),
                'venue': info['venue'],
                'surface': info['surface'],
                'dist': info['dist'],
                'race_class': info['race_class'],
                'start_time': info['start_time'].strftime('%H:%M'),
                'top1_odds': odds,
                'top1_horse_num': horse_num,
                'conditions': matched,
                'amount': 100,
                'updated_at': now.strftime('%Y-%m-%d %H:%M'),
            }
            push_bet_target(payload)

            # Discord通知（Scriptableリンク付き）
            msg  = '🎯 **条件合致レース！**\n'
            msg += '━━━━━━━━━━━━\n'
            msg += f'📍 {label}\n'
            msg += f'⏱ 発走: {info["start_time"].strftime("%H:%M")} ({minutes_until:.0f}分前)\n'
            msg += f'💴 1番人気: {horse_num}番 {odds}倍\n'
            msg += '━━━━━━━━━━━━\n'
            for m in matched:
                msg += f'✅ {m}\n'
            msg += '━━━━━━━━━━━━\n'
            msg += '🎟 買い方: 1番人気単勝 100円\n'
            msg += '📲 **自動購入はこちら↓**\n'
            msg += 'scriptable:///run?scriptName=umaca_auto'
            print(msg)
            send_discord(msg)

        except Exception as e:
            print(f'  error [{race_id}]: {e}')

    print('=== done ===')

if __name__ == '__main__':
    main()
