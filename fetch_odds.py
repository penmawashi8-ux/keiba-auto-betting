import requests
import json
import re
import sys
import os
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))

def fetch_odds(race_id):
headers = {
“User-Agent”: “Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15”,
“Referer”: “https://race.sp.netkeiba.com/”,
“Accept-Language”: “ja-JP,ja;q=0.9”,
}

```
session = requests.Session()
odds = []

urls = [
    f"https://race.sp.netkeiba.com/?pid=odds_view&race_id={race_id}&type=b1",
    f"https://race.netkeiba.com/odds/index.html?race_id={race_id}&type=b1",
]

for url in urls:
    print(f"[fetch] {url}")
    try:
        resp = session.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        odds = parse_html(resp.text)
        if odds:
            print(f"[fetch] OK: {len(odds)} horses")
            break
    except Exception as e:
        print(f"[fetch] failed: {e}")

return odds
```

def parse_html(html):
odds = []

```
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
for row in rows:
    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
    if len(cells) < 2:
        continue

    clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]

    try:
        horse_num = int(clean[0])
    except ValueError:
        continue
    if not (1 <= horse_num <= 18):
        continue

    odds_val = None
    horse_name = str(horse_num) + "ban"
    for val in clean[1:]:
        val2 = val.replace(',', '')
        try:
            v = float(val2)
            if 1.0 <= v < 9999:
                odds_val = v
        except ValueError:
            if 2 <= len(val) <= 15 and not re.match(r'^\d', val):
                horse_name = val

    if odds_val:
        odds.append({
            "horse_num": horse_num,
            "horse_name": horse_name,
            "odds": odds_val
        })

seen = set()
unique = []
for o in odds:
    if o["horse_num"] not in seen:
        seen.add(o["horse_num"])
        unique.append(o)

unique.sort(key=lambda x: x["odds"])
return unique
```

def main():
if len(sys.argv) >= 2:
race_id = sys.argv[1]
elif os.environ.get(“RACE_ID”):
race_id = os.environ[“RACE_ID”]
else:
print(“Usage: python fetch_odds.py <race_id>”)
sys.exit(1)

```
print(f"[main] race_id={race_id}")

odds_raw = fetch_odds(race_id)

odds_jp = []
for o in odds_raw:
    odds_jp.append({
        "horse_num": o["horse_num"],
        "horse_name": o["horse_name"],
        "odds": o["odds"]
    })

result = {
    "race_id": race_id,
    "fetched_at": datetime.now(JST).isoformat(),
    "status": "ok" if odds_jp else "error",
    "count": len(odds_jp),
    "odds": odds_jp
}

if not odds_jp:
    result["error"] = "no odds found"

with open("odds.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"[main] wrote {len(odds_jp)} entries to odds.json")
for o in odds_jp:
    print(f"  {o['horse_num']}ban {o['horse_name']} {o['odds']}")

if not odds_jp:
    sys.exit(1)
```

if **name** == “**main**”:
main()
