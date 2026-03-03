“””
fetch_odds.py
GitHub Actions から実行され、netkeibaから単勝オッズを取得して
odds.json に書き出すスクリプト。

race_id の構造:
2026 06 02 02 01
年   場  回  日  レース番号

JRA 場コード:
01=札幌 02=函館 03=福島 04=新潟 05=東京
06=中山 07=中京 08=京都 09=阪神 10=小倉
“””

import requests
import json
import re
import sys
import os
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))

# ============================================================

# race_id を組み立てる

# ============================================================

def build_race_id(year, place, kai, day, race_num):
“””
year      : int  例 2026
place     : str  例 ‘06’（中山）
kai       : str  例 ‘02’（第2回）
day       : str  例 ‘02’（2日目）
race_num  : str  例 ‘11’（11レース）
“””
return f”{year}{place.zfill(2)}{kai.zfill(2)}{day.zfill(2)}{race_num.zfill(2)}”

# ============================================================

# netkeibaのSP版オッズページから単勝オッズを取得

# ============================================================

def fetch_odds_from_netkeiba(race_id: str) -> list[dict]:
“””
戻り値: [{“馬番”: 1, “馬名”: “xxx”, “オッズ”: 2.1}, …]
オッズ昇順にソート済み
“””
headers = {
“User-Agent”: (
“Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) “
“AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1”
),
“Referer”: “https://race.sp.netkeiba.com/”,
“Accept-Language”: “ja-JP,ja;q=0.9”,
}

```
# SP版オッズページ（単勝）
url = f"https://race.sp.netkeiba.com/?pid=odds_view&race_id={race_id}&type=b1"
print(f"[fetch] URL: {url}")

session = requests.Session()
resp = session.get(url, headers=headers, timeout=15)
resp.raise_for_status()
html = resp.text

print(f"[fetch] HTML length: {len(html)}")

odds_list = parse_odds_html(html)

# 取れなかった場合はPC版も試す
if not odds_list:
    print("[fetch] SP版失敗 → PC版を試みます")
    url_pc = f"https://race.netkeiba.com/odds/index.html?race_id={race_id}&type=b1"
    resp2 = session.get(url_pc, headers=headers, timeout=15)
    resp2.raise_for_status()
    odds_list = parse_odds_html(resp2.text)

odds_list.sort(key=lambda x: x["オッズ"])
return odds_list
```

# ============================================================

# HTMLパース（正規表現ベース）

# ============================================================

def parse_odds_html(html: str) -> list[dict]:
odds_list = []

```
# パターン1: netkeibaのSP版テーブル
# <td class="Num">1</td>...<td class="Name"><a ...>馬名</a></td>...<td class="Odds">2.1</td>
pattern_blocks = re.findall(
    r'<tr[^>]*>.*?</tr>',
    html,
    re.DOTALL | re.IGNORECASE
)

for block in pattern_blocks:
    # 馬番
    num_match = re.search(r'<td[^>]*class="[^"]*Num[^"]*"[^>]*>(\d{1,2})</td>', block, re.IGNORECASE)
    # オッズ（数字.数字 の形式）
    odds_match = re.search(r'<td[^>]*class="[^"]*Odds[^"]*"[^>]*>([\d,]+\.?\d*)</td>', block, re.IGNORECASE)
    # 馬名
    name_match = re.search(r'<td[^>]*class="[^"]*Name[^"]*"[^>]*>.*?<a[^>]*>([^<]+)</a>', block, re.DOTALL | re.IGNORECASE)

    if num_match and odds_match:
        horse_num = int(num_match.group(1))
        odds_val = float(odds_match.group(1).replace(',', ''))
        horse_name = name_match.group(1).strip() if name_match else f"{horse_num}番"

        if 1 <= horse_num <= 18 and 1.0 <= odds_val < 9999:
            odds_list.append({
                "馬番": horse_num,
                "馬名": horse_name,
                "オッズ": odds_val
            })

if odds_list:
    print(f"[parse] パターン1で {len(odds_list)} 頭取得")
    return odds_list

# パターン2: data-* 属性や JSON 埋め込みを探す
json_match = re.search(r'var\s+odds\s*=\s*(\[.+?\]);', html, re.DOTALL)
if json_match:
    try:
        data = json.loads(json_match.group(1))
        for item in data:
            if isinstance(item, dict):
                num = item.get('num') or item.get('horse_num') or item.get('馬番')
                name = item.get('name') or item.get('horse_name') or item.get('馬名', '')
                odds = item.get('odds') or item.get('tan_odds') or item.get('オッズ')
                if num and odds:
                    odds_list.append({
                        "馬番": int(num),
                        "馬名": str(name),
                        "オッズ": float(odds)
                    })
        if odds_list:
            print(f"[parse] パターン2(JSON埋め込み)で {len(odds_list)} 頭取得")
            return odds_list
    except Exception as e:
        print(f"[parse] JSON解析失敗: {e}")

# パターン3: テーブルの td を総当たりで探す（汎用）
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
for row in rows:
    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
    if len(cells) < 2:
        continue

    # タグを除去してテキストのみ
    clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]

    # 先頭が馬番（1〜18の整数）かチェック
    try:
        horse_num = int(clean[0])
    except ValueError:
        continue
    if not (1 <= horse_num <= 18):
        continue

    # どこかのセルにオッズらしい数値があるか探す
    odds_val = None
    horse_name = f"{horse_num}番"
    for i, val in enumerate(clean[1:], 1):
        val_clean = val.replace(',', '')
        try:
            v = float(val_clean)
            if 1.0 <= v < 9999:
                odds_val = v
        except ValueError:
            # 馬名候補
            if 2 <= len(val) <= 15 and not re.match(r'^\d', val):
                horse_name = val

    if odds_val:
        odds_list.append({
            "馬番": horse_num,
            "馬名": horse_name,
            "オッズ": odds_val
        })

# 重複除去（馬番優先）
seen = set()
unique = []
for o in odds_list:
    if o["馬番"] not in seen:
        seen.add(o["馬番"])
        unique.append(o)

print(f"[parse] パターン3(総当たり)で {len(unique)} 頭取得")
return unique
```

# ============================================================

# メイン: 引数または環境変数から race_id を受け取り odds.json を出力

# ============================================================

def main():
# 引数: python fetch_odds.py <race_id>
# 環境変数: RACE_ID=202606020201
if len(sys.argv) >= 2:
race_id = sys.argv[1]
elif os.environ.get(“RACE_ID”):
race_id = os.environ[“RACE_ID”]
else:
print(“使い方: python fetch_odds.py <race_id>”)
print(“例:     python fetch_odds.py 202606020211”)
sys.exit(1)

```
print(f"[main] race_id = {race_id}")

try:
    odds = fetch_odds_from_netkeiba(race_id)
except Exception as e:
    print(f"[ERROR] オッズ取得失敗: {e}")
    # 失敗してもエラー情報をJSONに書いて終了
    result = {
        "race_id": race_id,
        "fetched_at": datetime.now(JST).isoformat(),
        "status": "error",
        "error": str(e),
        "odds": []
    }
    with open("odds.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    sys.exit(1)

result = {
    "race_id": race_id,
    "fetched_at": datetime.now(JST).isoformat(),
    "status": "ok",
    "count": len(odds),
    "odds": odds
}

with open("odds.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"[main] odds.json に {len(odds)} 頭分を書き出しました")
for o in odds:
    print(f"  {o['馬番']}番 {o['馬名']:12s} {o['オッズ']}倍")
```

if **name** == “**main**”:
main()
